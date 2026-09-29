import { Construct } from "constructs";
import { Stack, StackProps, CfnOutput, Fn } from "aws-cdk-lib";
import { AuthConstruct } from "./auth-construct";
import { SiteConstruct } from "./site-construct";
import { ApiConstruct } from "./api-construct";
import { DomainConstruct } from "./domain-construct";
import { CiConstruct } from "./ci-construct";

const DOMAIN_NAME = "edgebeaconai.com";
const GITHUB_ORG = "TD-SYNNEX";
const GITHUB_REPO = "edge-beacon";

export interface EdgeBeaconStackProps extends StackProps {
  /**
   * "production" gets the custom domain (edgebeaconai.com) and deploys from
   * main. "staging" is a full parallel copy of every resource — its own
   * Cognito pool, Lambda, S3 bucket, CloudFront distribution — reachable
   * only at its own CloudFront-issued domain, deployed from the "staging"
   * branch. Nothing here is shared between the two except the AWS account
   * and the GitHub OIDC provider (see CiConstruct's importExistingOidcProvider).
   */
  stage: "production" | "staging";
}

export class EdgeBeaconStack extends Stack {
  constructor(scope: Construct, id: string, props: EdgeBeaconStackProps) {
    super(scope, id, props);
    const isProd = props.stage === "production";

    // Custom domain is production-only: staging is for testing before a
    // prod push, not for a public-facing URL, so it just uses the
    // CloudFront-issued domain (SiteConstruct already supports that when
    // domainNames/certificate/hostedZone are omitted) and skips the
    // Route 53 zone + ACM cert entirely.
    const domain = isProd
      ? new DomainConstruct(this, "Domain", { domainName: DOMAIN_NAME })
      : undefined;

    // Site next: its CloudFront domain (and now the custom domain) feed
    // Auth's callback URLs, and Api adds its /api/* behavior onto the one
    // distribution Site creates.
    const site = new SiteConstruct(this, "Site", {
      domainNames: domain?.domainNames,
      certificate: domain?.certificate,
      hostedZone: domain?.hostedZone,
    });

    const auth = new AuthConstruct(this, "Auth", {
      extraCallbackUrls: [
        `https://${site.distribution.distributionDomainName}/`,
        ...(domain?.domainNames.map((d) => `https://${d}/`) ?? []),
      ],
    });

    const api = new ApiConstruct(this, "Api", {
      userPool: auth.userPool,
      client: auth.client,
      distribution: site.distribution,
      functionName: isProd ? "edge-beacon-api" : "edge-beacon-api-staging",
    });

    // GitHub Actions OIDC role for .github/workflows/deploy*.yml. Independent
    // of the app resources above — only needs the account/region context.
    // IAM allows only one OIDC provider per issuer URL per account, so only
    // the production stack (deployed first, and already live) creates it;
    // staging imports the same provider by its deterministic ARN.
    const ci = new CiConstruct(this, "Ci", {
      githubOrg: GITHUB_ORG,
      githubRepo: GITHUB_REPO,
      branch: isProd ? "main" : "staging",
      roleName: isProd
        ? "edge-beacon-github-deploy"
        : "edge-beacon-github-deploy-staging",
      importExistingOidcProvider: !isProd,
    });

    new CfnOutput(this, "SiteUrl", {
      value: `https://${site.distribution.distributionDomainName}`,
    });
    if (domain) {
      new CfnOutput(this, "CustomDomainUrl", {
        value: `https://${DOMAIN_NAME}`,
      });
      new CfnOutput(this, "DomainNameServers", {
        // Fn.join, not Array.prototype.join: hostedZoneNameServers is a CDK
        // "list token" (a CloudFormation GetAtt list attribute), and the
        // native JS .join() trips CDK's EncodedListTokenInScalarContext
        // validator — confirmed live, isolated to this exact line.
        value: Fn.join(", ", domain.hostedZone.hostedZoneNameServers!),
        description:
          "Set these 4 as edgebeaconai.com's nameservers at GoDaddy (Domain Settings -> Nameservers -> Custom).",
      });
    }
    new CfnOutput(this, "CognitoHostedUiDomain", {
      value: auth.domain.baseUrl(),
    });
    new CfnOutput(this, "CognitoUserPoolId", {
      value: auth.userPool.userPoolId,
    });
    new CfnOutput(this, "CognitoClientId", {
      value: auth.client.userPoolClientId,
    });
    new CfnOutput(this, "CognitoRegion", { value: this.region });
    new CfnOutput(this, "ProviderKeysSecretArn", {
      value: api.providerKeysSecretArn,
      description:
        "Set {OPENAI_API_KEY, TYPESAFE_API_KEY} as this secret's JSON value after first deploy.",
    });
    new CfnOutput(this, "GitHubDeployRoleArn", {
      value: ci.deployRoleArn,
      description: `Set as the AWS_DEPLOY_ROLE_ARN secret in the GitHub repo's "${props.stage}" environment (Settings -> Environments).`,
    });
  }
}
