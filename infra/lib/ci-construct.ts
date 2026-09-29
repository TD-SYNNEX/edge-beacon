import { Construct } from "constructs";
import { Stack, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

export interface CiConstructProps {
  githubOrg: string;
  githubRepo: string;
  /** @default "main" */
  branch?: string;
  /** @default "edge-beacon-github-deploy" */
  roleName?: string;
  /**
   * IAM allows only one OIDC provider per issuer URL per account. The first
   * CiConstruct deployed (production) creates it; every other one (staging)
   * must import the same provider by its deterministic ARN instead of
   * re-creating it, or the deploy fails with EntityAlreadyExists.
   */
  importExistingOidcProvider?: boolean;
}

/**
 * GitHub Actions OIDC federation: lets .github/workflows/deploy.yml assume a
 * role and run `cdk deploy` with no static AWS keys stored in GitHub. Scoped
 * tightly to one repo + branch — token.actions.githubusercontent.com:sub
 * must match exactly, so a workflow from any other repo/branch is refused.
 *
 * The sub claim's exact format was confirmed live by printing a real OIDC
 * token from this repo's own Actions run, not assumed from GitHub's docs:
 * this account issues the newer "immutable" subject format, which embeds
 * numeric owner/repo IDs — `repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/heads/BRANCH`
 * — not the classic `repo:ORG/REPO:ref:refs/heads/BRANCH`. The classic format
 * caused a real `Not authorized to perform sts:AssumeRoleWithWebIdentity`
 * failure on the first live deploy attempt. These IDs are permanent for the
 * life of the repo (that's the whole point of the newer format), so they're
 * safe to hardcode rather than parameterize.
 */
export class CiConstruct extends Construct {
  readonly deployRoleArn: string;

  constructor(scope: Construct, id: string, props: CiConstructProps) {
    super(scope, id);
    const branch = props.branch ?? "main";
    const ORG_ID = "109152567"; // TD-SYNNEX
    const REPO_ID = "1387962932"; // edge-beacon

    const account = Stack.of(this).account;
    const providerArn = `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`;
    if (!props.importExistingOidcProvider) {
      new iam.OidcProviderNative(this, "GitHubOidc", {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      });
    }

    const role = new iam.Role(this, "DeployRole", {
      roleName: props.roleName ?? "edge-beacon-github-deploy",
      assumedBy: new iam.FederatedPrincipal(
        providerArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": `repo:${props.githubOrg}@${ORG_ID}/${props.githubRepo}@${REPO_ID}:ref:refs/heads/${branch}`,
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
