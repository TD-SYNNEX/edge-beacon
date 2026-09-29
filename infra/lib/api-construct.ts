import { Construct } from "constructs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import type * as cognito from "aws-cdk-lib/aws-cognito";

export interface ApiConstructProps {
  userPool: cognito.UserPool;
  client: cognito.UserPoolClient;
  /** The one distribution SiteConstruct created; this adds a second behavior to it. */
  distribution: cloudfront.Distribution;
}

export class ApiConstruct extends Construct {
  readonly fn: lambda.Function;
  readonly providerKeysSecretArn: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // Generated at synth time, embedded as a literal — not a rotated secret,
    // just an anti-direct-access shim (see functionUrl below).
    const originSharedSecret = crypto.randomBytes(24).toString("hex");

    // One combined secret for both provider keys, not one each — halves the
    // Secrets Manager line item; the IAM grant is a single ARN either way.
    // Values are set out of band (console/CLI), never in code or CDK context.
    const providerKeys = new secretsmanager.Secret(this, "ProviderKeys", {
      description: "edge-beacon: OPENAI_API_KEY and TYPESAFE_API_KEY",
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.fn = new lambda.Function(this, "Function", {
      functionName: "edge-beacon-api",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist/server")),
      timeout: Duration.seconds(30),
      memorySize: 512,
      logGroup,
      environment: {
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.client.userPoolClientId,
        COGNITO_REGION: Stack.of(this).region,
        SECRETS_ARN: providerKeys.secretArn,
        AI_ENABLED: "true",
        JEV_ENABLED: "true",
        ORIGIN_SHARED_SECRET: originSharedSecret,
        // AUTH_TEST_MODE is deliberately never set here — the unsigned
        // test-token path (server/auth.ts) must stay unreachable in prod.
      },
    });
    providerKeys.grantRead(this.fn);
    this.providerKeysSecretArn = providerKeys.secretArn;

    // NONE, not AWS_IAM: CloudFront OAC would sign the origin request's own
    // Authorization header with SigV4, which collides with this app's own
    // Authorization: Bearer <JWT> header — confirmed live, AWS_IAM + OAC
    // returned AccessDeniedException on every request, because the client's
    // forwarded bearer token overwrote CloudFront's SigV4 signature before
    // it reached the origin. The two can't share that one header. Anti
    // direct-access is instead the shared-secret header below, checked by
    // server/api.ts before the real Cognito JWT check.
    const functionUrl = this.fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFront forbids forwarding Authorization via an OriginRequestPolicy
    // (cache-poisoning guard) — it must go through a CachePolicy's header
    // allow-list instead, which also forwards it to the origin. TTLs stay at
    // zero: every /api/* response is already Cache-Control: no-store.
    const apiCachePolicy = new cloudfront.CachePolicy(this, "ApiCachePolicy", {
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Authorization"),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      enableAcceptEncodingGzip: true,
    });
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "ApiOriginRequestPolicy",
      {
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          "Content-Type",
          "Origin",
        ),
      },
    );

    const apiOrigin = new origins.FunctionUrlOrigin(functionUrl, {
      customHeaders: { "X-Origin-Verify": originSharedSecret },
    });

    props.distribution.addBehavior("/api/*", apiOrigin, {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: apiCachePolicy,
      originRequestPolicy: apiOriginRequestPolicy,
    });
  }
}
