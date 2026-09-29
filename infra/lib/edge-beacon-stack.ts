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

export class EdgeBeaconStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Independent of everything else: the hosted zone + cert don't reference
    // any other resource here, so there's no ordering constraint on this one.
    const domain = new DomainConstruct(this, "Domain", {
      domainName: DOMAIN_NAME,
    });

    // Site next: its CloudFront domain (and now the custom domain) feed
    // Auth's callback URLs, and Api adds its /api/* behavior onto the one
    // distribution Site creates.
    const site = new SiteConstruct(this, "Site", {
      domainNames: domain.domainNames,
      certificate: domain.certificate,
      hostedZone: domain.hostedZone,
    });

    const auth = new AuthConstruct(this, "Auth", {
      extraCallbackUrls: [
        `https://${site.distribution.distributionDomainName}/`,
        ...domain.domainNames.map((d) => `https://${d}/`),
      ],
    });

    const api = new ApiConstruct(this, "Api", {
      userPool: auth.userPool,
      client: auth.client,
      distribution: site.distribution,
    });

    // GitHub Actions OIDC role for .github/workflows/deploy.yml. Independent
    // of the app resources above — only needs the account/region context.
    const ci = new CiConstruct(this, "Ci", {
      githubOrg: GITHUB_ORG,
      githubRepo: GITHUB_REPO,
      branch: "main",
    });

    new CfnOutput(this, "SiteUrl", {
      value: `https://${site.distribution.distributionDomainName}`,
    });
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
      description:
        "Set as the AWS_DEPLOY_ROLE_ARN secret in the GitHub repo (Settings -> Secrets and variables -> Actions).",
    });
  }
}
