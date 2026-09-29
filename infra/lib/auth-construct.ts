import { Construct } from "constructs";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  Duration,
  RemovalPolicy,
  Names,
  CustomResource,
  Stack,
} from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";

export interface AuthConstructProps {
  /** Callback/logout URLs beyond local dev — e.g. the deployed CloudFront domain. */
  extraCallbackUrls?: string[];
}

/** Matches shared/edge-types.ts's WorkspacePerspective. */
const GROUPS = ["partner", "sales", "practice_leader", "admin"] as const;
const LOCAL_DEV_URL = "http://127.0.0.1:5173/"; // known at synth time, no live token

export class AuthConstruct extends Construct {
  readonly userPool: cognito.UserPool;
  readonly client: cognito.UserPoolClient;
  readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthConstructProps = {}) {
    super(scope, id);

    // One pool, shared by local dev and prod — a second "dev" pool is pure
    // overhead for an internal tool. Groups become the source of truth for
    // the perspective selector (see server/auth.ts's defaultPerspective).
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "edge-beacon",
      // Self-service sign-up: Hosted UI shows a "Sign up" link automatically
      // once this is true — no custom sign-up page/form needed in this app.
      // New sign-ups land in the "partner" group by default (see the
      // PostConfirmation trigger below); internal groups (sales/
      // practice_leader/admin) still require manual provisioning.
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: false } },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN, // never drop the user directory on a stack tear-down
    });

    for (const groupName of GROUPS)
      new cognito.CfnUserPoolGroup(this, `Group-${groupName}`, {
        userPoolId: this.userPool.userPoolId,
        groupName,
      });

    // Every self-signed-up user needs at least one group — server/beacon-api.ts
    // rejects an identity with none — so default them to the least-privileged one.
    const postConfirmation = new lambda.Function(
      this,
      "PostConfirmationHandler",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        handler: "index.handler",
        timeout: Duration.seconds(10),
        code: lambda.Code.fromInline(`
        const {
          CognitoIdentityProviderClient,
          AdminAddUserToGroupCommand,
        } = require("@aws-sdk/client-cognito-identity-provider");
        const client = new CognitoIdentityProviderClient({});
        exports.handler = async (event) => {
          await client.send(
            new AdminAddUserToGroupCommand({
              UserPoolId: event.userPoolId,
              Username: event.userName,
              GroupName: "partner",
            }),
          );
          return event;
        };
      `),
      },
    );
    postConfirmation.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminAddUserToGroup"],
        // Wildcard pool-id segment, not this.userPool.userPoolArn: a literal
        // reference to the pool here would create UserPool -> Handler (the
        // trigger config) -> Policy -> UserPool, a cycle CloudFormation
        // rejects. This Lambda only exists for this one trigger and is only
        // ever invoked by Cognito post-confirmation, so the broader scope
        // (any pool in this account/region) is an acceptable tradeoff.
        resources: [
          `arn:aws:cognito-idp:${Stack.of(this).region}:${Stack.of(this).account}:userpool/*`,
        ],
      }),
    );
    this.userPool.addTrigger(
      cognito.UserPoolOperation.POST_CONFIRMATION,
      postConfirmation,
    );

    this.domain = this.userPool.addDomain("HostedUiDomain", {
      cognitoDomain: {
        // Cognito domain prefixes are globally unique across all AWS accounts.
        domainPrefix: `edge-beacon-${Names.uniqueId(this).slice(-16).toLowerCase()}`,
      },
      // Managed login v2: unlocks the branding designer (colors, logo,
      // corner radius) used below. Classic hosted UI (v1, the default)
      // has no branding API at all.
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // Only the synth-time-known local dev URL here. The CloudFront domain
    // (props.extraCallbackUrls) is deliberately NOT wired in at creation —
    // doing so would make this client depend on the Distribution, while
    // ApiConstruct's Lambda already depends on this client (env vars) and
    // the Distribution depends on that Lambda (the /api/* origin), closing
    // a cycle CloudFormation rejects outright ("Circular dependency between
    // resources"). The CloudFront domain is patched in afterward, below, by
    // a resource that depends on both but that nothing depends on — a sink,
    // not a link back into the cycle.
    this.client = this.userPool.addClient("SpaClient", {
      generateSecret: false, // public client: a browser can't protect a secret
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [LOCAL_DEV_URL],
        logoutUrls: [LOCAL_DEV_URL],
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(30),
      enableTokenRevocation: true,
    });

    if (props.extraCallbackUrls?.length)
      this.patchCallbackUrls([LOCAL_DEV_URL, ...props.extraCallbackUrls]);

    // Managed login branding: matches the TD SYNNEX design system (deep
    // teal actions, white surfaces, 2px corners). settings.json started
    // from Cognito's own defaults (DescribeManagedLoginBrandingByClient
    // with ReturnMergedResources) and was verified live in the browser
    // before being committed here — the Settings schema isn't documented
    // in AWS's API reference, so this was validated empirically, not
    // guessed. The flat light-grey background SVG replaces Cognito's
    // default decorative swoosh graphic, which a plain color/enabled
    // toggle doesn't remove — confirmed live that only overriding the
    // PAGE_BACKGROUND asset itself (as SVG, matching the default's own
    // extension) actually replaces it.
    new cognito.CfnManagedLoginBranding(this, "Branding", {
      userPoolId: this.userPool.userPoolId,
      clientId: this.client.userPoolClientId,
      settings: JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "assets/managed-login-settings.json"),
          "utf8",
        ),
      ),
      assets: [
        {
          category: "PAGE_HEADER_LOGO",
          colorMode: "LIGHT",
          extension: "PNG",
          bytes: fs
            .readFileSync(
              path.join(__dirname, "assets/cognito-header-logo.png"),
            )
            .toString("base64"),
        },
        {
          category: "PAGE_BACKGROUND",
          colorMode: "LIGHT",
          extension: "SVG",
          bytes: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f0f0f0"/></svg>',
          ).toString("base64"),
        },
      ],
    });
  }

  /**
   * Adds URLs to the app client's callback/logout list via a real
   * describe-then-update (per the aws-auth skill's warning:
   * UpdateUserPoolClient is a full replace — omitting a field resets it to
   * default). Merges into whatever the client already has rather than
   * overwriting, so this stays idempotent across redeploys.
   */
  private patchCallbackUrls(urls: string[]): void {
    const handler = new lambda.Function(this, "CallbackUrlPatchHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      timeout: Duration.seconds(30),
      // Inline: AWS SDK v3 (incl. @aws-sdk/client-cognito-identity-provider)
      // ships pre-installed in the Node 22 Lambda runtime — no bundling.
      code: lambda.Code.fromInline(`
        const {
          CognitoIdentityProviderClient,
          DescribeUserPoolClientCommand,
          UpdateUserPoolClientCommand,
        } = require("@aws-sdk/client-cognito-identity-provider");
        const client = new CognitoIdentityProviderClient({});
        exports.handler = async (event) => {
          if (event.RequestType === "Delete") return {};
          const { UserPoolId, ClientId, CallbackURLs, LogoutURLs } = event.ResourceProperties;
          const described = await client.send(
            new DescribeUserPoolClientCommand({ UserPoolId, ClientId }),
          );
          const current = described.UserPoolClient || {};
          const merge = (existing, extra) => [...new Set([...(existing || []), ...extra])];
          const update = {
            ...current,
            UserPoolId,
            ClientId,
            CallbackURLs: merge(current.CallbackURLs, CallbackURLs),
            LogoutURLs: merge(current.LogoutURLs, LogoutURLs),
          };
          delete update.ClientSecret;
          delete update.CreationDate;
          delete update.LastModifiedDate;
          await client.send(new UpdateUserPoolClientCommand(update));
          return {};
        };
      `),
    });
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:UpdateUserPoolClient",
        ],
        resources: [this.userPool.userPoolArn],
      }),
    );
    const provider = new cr.Provider(this, "CallbackUrlPatchProvider", {
      onEventHandler: handler,
    });
    new CustomResource(this, "CallbackUrlPatch", {
      serviceToken: provider.serviceToken,
      properties: {
        UserPoolId: this.userPool.userPoolId,
        ClientId: this.client.userPoolClientId,
        CallbackURLs: urls,
        LogoutURLs: urls,
      },
    });
  }
}
