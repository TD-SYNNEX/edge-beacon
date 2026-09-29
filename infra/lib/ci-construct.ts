import { Construct } from "constructs";
import { Stack, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

export interface CiConstructProps {
  githubOrg: string;
  githubRepo: string;
  /** @default "main" */
  branch?: string;
}

/**
 * GitHub Actions OIDC federation: lets .github/workflows/deploy.yml assume a
 * role and run `cdk deploy` with no static AWS keys stored in GitHub. Scoped
 * tightly to one repo + branch — token.actions.githubusercontent.com:sub
 * must match exactly, so a workflow from any other repo/branch is refused.
 */
export class CiConstruct extends Construct {
  readonly deployRoleArn: string;

  constructor(scope: Construct, id: string, props: CiConstructProps) {
    super(scope, id);
    const branch = props.branch ?? "main";

    const provider = new iam.OidcProviderNative(this, "GitHubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const role = new iam.Role(this, "DeployRole", {
      roleName: "edge-beacon-github-deploy",
      assumedBy: new iam.FederatedPrincipal(
        provider.oidcProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/${branch}`,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      maxSessionDuration: Duration.hours(1),
      description: `Assumed by GitHub Actions on ${props.githubOrg}/${props.githubRepo}@${branch} to deploy via CDK.`,
    });

    // Only permission this role needs: hop into the CDK bootstrap roles,
    // which already carry the actual (narrow, CDK-managed) deploy
    // permissions. No hand-authored parallel policy set to keep in sync.
    const account = Stack.of(this).account;
    const region = Stack.of(this).region;
    const qualifier = "hnb659fds"; // CDK's default bootstrap qualifier
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:aws:iam::${account}:role/cdk-${qualifier}-deploy-role-${account}-${region}`,
          `arn:aws:iam::${account}:role/cdk-${qualifier}-file-publishing-role-${account}-${region}`,
          `arn:aws:iam::${account}:role/cdk-${qualifier}-image-publishing-role-${account}-${region}`,
          `arn:aws:iam::${account}:role/cdk-${qualifier}-lookup-role-${account}-${region}`,
        ],
      }),
    );

    this.deployRoleArn = role.roleArn;
  }
}
