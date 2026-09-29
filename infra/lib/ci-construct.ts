import { Construct } from "constructs";
import { Stack, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

export interface CiConstructProps {
  githubOrg: string;
  githubRepo: string;
  /** The GitHub Actions environment (Settings -> Environments) this role trusts. */
  environmentName: string;
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
 * GitHub Actions OIDC federation: lets .github/workflows/deploy*.yml assume a
 * role and run `cdk deploy` with no static AWS keys stored in GitHub. Scoped
 * tightly to one repo + GitHub Actions environment —
 * token.actions.githubusercontent.com:sub must match exactly, so a workflow
 * outside that environment is refused.
 *
 * The sub claim's exact format was confirmed live by printing a real OIDC
 * token from this repo's own Actions run, not assumed from GitHub's docs —
 * twice. First: this account issues the newer "immutable" subject format,
 * embedding numeric owner/repo IDs — `repo:ORG@ORG_ID/REPO@REPO_ID:...` — not
 * the classic `repo:ORG/REPO:...`. Second, and more surprising: once a job
 * declares `environment:` (added so deploy.yml/deploy-staging.yml could each
 * resolve their own environment-scoped secrets), GitHub swaps the sub claim's
 * suffix from `ref:refs/heads/BRANCH` to `environment:ENV_NAME` entirely —
 * confirmed live, this silently broke the branch-based trust condition below
 * the moment `environment: production` was added to deploy.yml. It's also a
 * strictly better boundary here anyway: deploy.yml and deploy-staging.yml are
 * both triggered via `workflow_run`, which GitHub always executes using the
 * *default* branch's copy of the workflow file regardless of which branch's
 * CI triggered it — so a ref-based condition can't actually tell the two
 * workflows apart (both would present `ref:refs/heads/main`); the
 * environment claim can. These IDs are permanent for the life of the repo
 * (that's the whole point of the newer format), so they're safe to hardcode.
 */
export class CiConstruct extends Construct {
  readonly deployRoleArn: string;

  constructor(scope: Construct, id: string, props: CiConstructProps) {
    super(scope, id);
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
            "token.actions.githubusercontent.com:sub": `repo:${props.githubOrg}@${ORG_ID}/${props.githubRepo}@${REPO_ID}:environment:${props.environmentName}`,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      maxSessionDuration: Duration.hours(1),
      description: `Assumed by GitHub Actions in the "${props.environmentName}" environment of ${props.githubOrg}/${props.githubRepo} to deploy via CDK.`,
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
