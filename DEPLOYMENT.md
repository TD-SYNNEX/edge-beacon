# Deployment runbook

This is the one file to read before deploying, redeploying, or debugging a
deploy of EDGE Beacon. Written so an AI agent (or a human) with no prior
context on this repo can act correctly on the first read.

**Status: live and verified.** `https://edgebeaconai.com` serves the app with a
real ACM certificate (not a placeholder), and the GitHub Actions deploy
pipeline has completed a real, unassisted, end-to-end run
(push → CI → OIDC → `cdk deploy` → live). See "Everyday deploy" below for what
that pipeline actually does.

## Architecture at a glance

```
GitHub (TD-SYNNEX/edge-beacon)
   │ push main                              │ push staging
   ▼                                        ▼
ci.yml ──success──▶ deploy.yml       ci.yml ──success──▶ deploy-staging.yml
  (test/build/e2e)    (env: production)      (test/build/e2e)  (env: staging)
        │                    │                       │                 │
        ▼                    ▼                       ▼                 ▼
  cdk deploy EdgeBeaconStack                    cdk deploy EdgeBeaconStagingStack
        │                                                │
        ▼                                                ▼
  infra/ (AWS CDK, account 655790569185, us-east-1) — one CDK app, two independent stacks
        │                                                │
  Route53+ACM+S3+CloudFront+Lambda+Cognito     S3+CloudFront+Lambda+Cognito
  edgebeaconai.com (custom domain)             <cloudfront-id>.cloudfront.net only
```

Production (`main`) and staging (`staging` branch) are two fully separate CDK
stacks — separate Cognito pool, Lambda, S3 bucket, CloudFront distribution —
sharing only the AWS account and the GitHub OIDC provider. See "Staging
environment" below.

- **Frontend**: Vite-built static SPA (`src/`), served from S3 behind CloudFront.
- **API**: same TypeScript code (`server/`) bundled two ways — as a Cloudflare-Worker-style
  handler for local dev (`npm run dev` / `npm start`) and as a Lambda handler for
  production, both from one `scripts/build.ts` esbuild pass.
- **Auth**: Amazon Cognito, Managed Login v2 (branded to match the TD SYNNEX design
  system), authorization-code + PKCE. Groups (`partner`/`sales`/`practice_leader`/`admin`)
  are the real authorization boundary — see `server/auth.ts`.
- **Domain**: `edgebeaconai.com` (registered at GoDaddy, DNS delegated to Route 53).
- **IaC**: `infra/lib/edge-beacon-stack.ts` is one stack class, instantiated twice by
  `infra/bin/edge-beacon.ts` — `EdgeBeaconStack` (`stage: "production"`) and
  `EdgeBeaconStagingStack` (`stage: "staging"`) — composed of: `DomainConstruct`
  (production only), `SiteConstruct`, `AuthConstruct`, `ApiConstruct`, `CiConstruct`.

## Prerequisites

- Node.js 22.15+, npm.
- AWS CLI v2.32+ and `aws login` access to account **655790569185** (profile used
  throughout this doc: `Tanishq-TDS` — substitute your own if different). `aws login
--profile <name>` gets short-lived credentials via SSO-style browser auth; prefer it
  over long-lived access keys (see the `signing-in-to-aws` skill/guide).
- `gh` CLI authenticated with admin access to `TD-SYNNEX/edge-beacon`, if changing GitHub
  secrets/settings.
- The AWS CDK CLI is a dev dependency of `infra/` (`npx cdk ...` — no global install needed).

## One-time setup (already done for this deployment — reference only)

1. `cd infra && npm ci && npx cdk bootstrap aws://655790569185/us-east-1 --profile <profile>`
   — once per account/region. Safe to re-run; no-ops if already bootstrapped.
2. `npm run build` (repo root) — produces `dist/client/` and `dist/server/index.mjs`,
   which the CDK app packages as the S3 and Lambda code assets. **Must run before every
   `cdk synth`/`cdk deploy`** — the CDK app reads these built files directly, it does not
   build them itself.
3. `cd infra && npx cdk deploy EdgeBeaconStack --profile <profile> --require-approval never`
   — creates everything: Route 53 zone, ACM cert (DNS-validated in the same zone),
   S3+CloudFront, Lambda+Cognito, and the GitHub OIDC deploy role + provider. (The app also
   defines `EdgeBeaconStagingStack` — see "Staging environment" below; deploy that
   separately, after this one, since it imports the OIDC provider this one creates.)
4. **Nameservers**: the deploy prints a `DomainNameServers` output (4 values). Set those
   as `edgebeaconai.com`'s custom nameservers in GoDaddy (Domain Settings → Nameservers →
   Custom). The ACM certificate cannot validate — and the stack deploy will sit waiting —
   until this delegation propagates. No fixed ETA; often minutes, can be longer.
5. **GitHub secret**: the deploy prints a `GitHubDeployRoleArn` output. Set it as an
   **environment-scoped** secret (not repo-level) so production and staging can each
   have their own role:
   ```sh
   gh secret set AWS_DEPLOY_ROLE_ARN --env production --repo TD-SYNNEX/edge-beacon --body "<arn>"
   ```
   This is the only credential GitHub Actions needs — no static AWS keys anywhere. The
   role trusts GitHub's OIDC provider, scoped to this exact repo + branch only (see
   `infra/lib/ci-construct.ts`) — no other repo or branch can assume it. **The trust
   condition's `sub` value is not the classic `repo:ORG/REPO:ref:refs/heads/BRANCH`
   format** — see the troubleshooting entry below before changing it.
6. **Provider keys** (optional, enables AI/Jev features): the deploy prints a
   `ProviderKeysSecretArn` output. Set real values:
   ```sh
   aws secretsmanager put-secret-value --secret-id <arn> \
     --secret-string '{"OPENAI_API_KEY":"sk-...","TYPESAFE_API_KEY":"..."}' \
     --profile <profile> --region us-east-1
   ```
   Must be valid JSON with exactly those two keys, even if one value is empty — the
   Lambda's `server/secrets.ts` falls back to "no keys" on anything unparseable, so a
   malformed value just means those features stay off, not a crash.
7. **Cognito users**: self-service sign-up is on (Hosted UI shows "Sign up"), and new
   sign-ups default to the `partner` group. To provision an internal user directly, or
   move someone into `sales`/`practice_leader`/`admin`:
   ```sh
   aws cognito-idp admin-create-user --user-pool-id <pool-id> --username <email> \
     --user-attributes Name=email,Value=<email> Name=email_verified,Value=true \
     --message-action SUPPRESS --profile <profile> --region us-east-1
   aws cognito-idp admin-set-user-password --user-pool-id <pool-id> --username <email> \
     --password '<TempPassword!1>' --permanent --profile <profile> --region us-east-1
   aws cognito-idp admin-add-user-to-group --user-pool-id <pool-id> --username <email> \
     --group-name admin --profile <profile> --region us-east-1
   ```

## Everyday deploy: the CI/CD pipeline (what actually runs on every push)

Push to `main` (or merge a PR into it) and this happens automatically, no manual steps:

1. **`.github/workflows/ci.yml`** ("Verify AI Atlas") runs on every push/PR: format check,
   unit tests, `npm run build`, Playwright e2e against both Vite dev and the built Worker.
2. **`.github/workflows/deploy.yml`** ("Deploy to AWS") triggers only after `ci.yml`
   _succeeds_ on `main` (via `workflow_run`, not a second `push` trigger — a red CI run
   never deploys). It assumes the OIDC role, rebuilds (`npm run build`), and runs
   `cdk deploy --require-approval never`.
3. CDK's `BucketDeployment` (`infra/lib/site-construct.ts`) uploads the new
   `dist/client/` to S3 and **auto-invalidates CloudFront's cache (`/*`) as part of the
   same deploy** — every deploy goes live immediately, no separate invalidation step and
   no stale cached pages. This is already wired in; nothing extra to configure.
4. If a resource genuinely didn't change (e.g. only server code changed, not CDK code),
   CloudFormation just updates that one resource — CDK diffs the whole stack every time,
   it doesn't blindly recreate everything.

**To deploy right now without waiting for CI** (e.g. testing a local change, or CI is
broken): run steps 2–3 of "one-time setup" manually. That's the entire manual deploy
procedure — `npm run build` then `cdk deploy EdgeBeaconStack`.

## Staging environment

`EdgeBeaconStagingStack` is a full parallel copy of production — its own Cognito user
pool/client, Lambda, S3 bucket, and CloudFront distribution — for testing changes before
they reach `main`. It is **not** a subdomain of edgebeaconai.com; it has no custom domain
at all, deliberately (staging isn't public-facing, so the Route 53/ACM machinery is
skipped entirely — see `isProd` in `infra/lib/edge-beacon-stack.ts`). It's reachable only
at its own CloudFront-issued URL (the `SiteUrl` stack output).

**Workflow**: push to the `staging` branch (or merge a PR into it). `ci.yml` runs the same
test/build/e2e suite it runs for `main`, then `.github/workflows/deploy-staging.yml`
deploys `EdgeBeaconStagingStack` — same shape as `deploy.yml`, different branch trigger,
different stack, different GitHub **environment** (`staging` instead of `production`, so
it resolves its own `AWS_DEPLOY_ROLE_ARN` secret and `VITE_COGNITO_*` variables). `main`
is untouched by any of this — production only ever deploys from `main`, exactly as before.

**One-time setup already done for this deployment:**

1. `cd infra && npx cdk deploy EdgeBeaconStagingStack --profile <profile> --require-approval never`
   — must run _after_ `EdgeBeaconStack` exists (production creates the GitHub OIDC
   provider; staging imports it by ARN rather than re-creating it — IAM allows only one
   OIDC provider per issuer URL per account, and a second `CreateOpenIDConnectProvider`
   call for the same URL fails with `EntityAlreadyExists`).
2. Created the `staging` and `production` GitHub environments (they don't exist until
   created or until a workflow first references them):
   ```sh
   gh api --method PUT repos/TD-SYNNEX/edge-beacon/environments/staging
   gh api --method PUT repos/TD-SYNNEX/edge-beacon/environments/production
   ```
3. Set each environment's own secret/variables from that stack's outputs:
   ```sh
   gh secret set AWS_DEPLOY_ROLE_ARN --env staging --repo TD-SYNNEX/edge-beacon --body "<GitHubDeployRoleArn output>"
   gh variable set VITE_COGNITO_DOMAIN --env staging --repo TD-SYNNEX/edge-beacon --body "<CognitoHostedUiDomain's prefix, e.g. edge-beacon-xxxx>"
   gh variable set VITE_COGNITO_CLIENT_ID --env staging --repo TD-SYNNEX/edge-beacon --body "<CognitoClientId output>"
   gh variable set VITE_COGNITO_REGION --env staging --repo TD-SYNNEX/edge-beacon --body "us-east-1"
   ```
   The same four names were also mirrored explicitly into the `production` environment
   (GitHub Actions falls back from environment-scoped to repo-level vars/secrets of the
   same name automatically, but the existing repo-level ones were copied in explicitly
   rather than relying on that fallback, so both environments are self-contained).
4. **Not yet done — do this before relying on AI/Jev features in staging**: the staging
   stack's `ProviderKeysSecretArn` output is a fresh, empty Secrets Manager secret (see
   one-time setup step 6 above, applied to the staging ARN instead).
5. To create the `staging` branch itself (if it doesn't exist yet): `git checkout -b
staging && git push -u origin staging`. After that, any push to `staging` deploys there;
   any push to `main` (as always) deploys production. Promote a change by merging
   `staging` → `main` once it's verified.

## Verifying a deploy

```sh
# Stack status
aws cloudformation describe-stacks --stack-name EdgeBeaconStack \
  --profile <profile> --region us-east-1 --query "Stacks[0].StackStatus" --output text

# Site responds
curl -sS -o /dev/null -w "%{http_code}\n" https://edgebeaconai.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://edgebeaconai.com/api/config   # expect 401, not 200/404/502

# Watch the API Lambda's logs (find the exact log group name first — it's not
# /aws/lambda/<function-name>, CDK assigns its own):
aws logs describe-log-groups --profile <profile> --region us-east-1 \
  --query "logGroups[?contains(logGroupName,'ApiLogGroup')].logGroupName" --output text
aws logs tail <log-group-name> --profile <profile> --region us-east-1 --since 5m
```

A `502`/`Internal Server Error` from `/api/*` almost always means the Lambda threw —
check the log group above, don't guess from the HTTP status alone.

## Known propagation delays (not bugs — confirmed live, more than once)

These are real AWS eventual-consistency windows, not deploy failures. If you hit one,
**wait 1–5 minutes and recheck** before assuming something is broken:

- Right after a CloudFront distribution config change (new behavior, new custom header,
  new domain), edge locations can serve stale config for a few minutes.
- Right after a Cognito Managed Login branding update, the login page can briefly show
  "Login pages unavailable."
- ACM certificate DNS validation depends on external DNS propagation (GoDaddy → Route 53
  delegation, or the validation CNAME itself) — this can take anywhere from minutes to
  longer, with no fixed SLA. Confirmed live: the `.com` registry itself can already show
  the new nameservers (verify with `dig NS edgebeaconai.com @a.gtld-servers.net`) while
  major public resolvers (Google's 8.8.8.8, your own machine's) still serve a stale
  negative-cached answer for a while longer — that staleness does not block ACM, which
  resolves authoritatively. To check the app is really live without waiting on your own
  resolver, force the real IP: `curl --resolve edgebeaconai.com:443:<a-record-ip> https://edgebeaconai.com/`.

## Troubleshooting — real bugs hit and fixed during this build

Keep this section growing. Each entry cost real debugging time; don't rediscover these.

**Every `/api/*` request 401'd even with a valid signed-in token.**
Root cause: `server/lambda.ts`'s handler used a default parameter
(`processEnv = process.env`) expecting a 3rd argument to be _absent_ on invocation. AWS
Lambda's Node runtime always passes a 3rd argument (a completion callback, for the legacy
callback-style handler signature) even though async handlers ignore it — so the default
never fired, and `processEnv` silently became that callback object instead of the real
environment. Fix: read `process.env` directly in the handler body, never via a default
parameter. (`server/lambda.ts`)

**`/api/*` returned `403 AccessDeniedException` from the Lambda Function URL.**
Root cause: the origin used `authType: AWS_IAM` + CloudFront Origin Access Control, which
makes CloudFront sign the origin request's own `Authorization` header with SigV4 — this
collides with the app's own `Authorization: Bearer <JWT>` header forwarded to the same
origin for the same purpose. The two can't share one header. Fix: `authType: NONE` on the
Function URL, replaced with a CloudFront-attached shared-secret header
(`X-Origin-Verify`) that `server/api.ts` checks before the real Cognito JWT check.
(`infra/lib/api-construct.ts`, `server/api.ts`)

**Every AI/Jev-enabled request crashed with `Dynamic require of "node:https" is not
supported`.** Root cause: esbuild bundling the AWS SDK's CJS internals
(`@smithy/node-http-handler`) into ESM output — a known esbuild limitation, not an AWS
SDK bug. Fix: `banner: { js: "import { createRequire } from 'node:module'; const
require = createRequire(import.meta.url);" }` in the esbuild config. (`scripts/build.ts`)

**A fresh visitor got a 403 on the JS/CSS bundle and could never reach login.**
Root cause: a CloudFront Function gating `/assets/*` behind a post-login session cookie
also blocked the JS bundle that _runs_ the login redirect — a chicken-and-egg lock-out.
There's no way to split "the code that starts login" from "the app bundle" without a
separate build entry point, which wasn't worth it. Fix: removed the edge gate entirely;
the real security boundary was always the API's JWT check, not the static bundle.
(`infra/lib/site-construct.ts`)

**Managed Login branding `Settings` JSON schema isn't documented by AWS.**
The `Settings` field on `AWS::Cognito::ManagedLoginBranding` is an opaque `document` type
with no published schema. Correct approach: create a style with
`UseCognitoProvidedValues: true`, read it back with
`DescribeManagedLoginBrandingByClient --return-merged-resources` to get the _real_ key
names, patch only what's needed, and verify visually in a browser before committing the
JSON to CDK (`infra/lib/assets/managed-login-settings.json`). Also: a plain
`pageBackground.image.enabled: false` does **not** remove Cognito's default decorative
background graphic — only replacing the `PAGE_BACKGROUND` asset itself (as an SVG,
matching the default's own file type) does.

**`Fn.join`, not `Array.prototype.join`, on a CDK "list token."**
`hostedZone.hostedZoneNameServers` is a `string[]` backed by a single encoded
CloudFormation list token, not a real array. Calling native `.join(", ")` on it throws
`EncodedListTokenInScalarContext` at synth time with a stack trace containing zero user
code (all internal to `aws-cdk-lib`) — hard to place without isolating the exact line via
a standalone test file. Fix: `Fn.join(", ", list)` from `aws-cdk-lib`, never the native
method, on anything that came from a CDK attribute lookup. (`infra/lib/edge-beacon-stack.ts`)

**GitHub Actions deploy failed with `Not authorized to perform
sts:AssumeRoleWithWebIdentity` despite a trust policy that looked correct.**
Root cause: this GitHub org/account issues the newer "immutable" OIDC subject
format, which embeds numeric owner/repo IDs —
`repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/heads/BRANCH` (e.g.
`repo:TD-SYNNEX@109152567/edge-beacon@1387962932:ref:refs/heads/main`) — not
the classic `repo:ORG/REPO:ref:refs/heads/BRANCH` documented as the default
example. Don't assume the classic format; if this ever needs re-deriving
(e.g. for a new repo), add a temporary step to the workflow that prints the
real token and read the `sub` claim directly rather than guessing:

```sh
curl -sSL -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" \
| node -e "const b=JSON.parse(require('fs').readFileSync(0,'utf8'));
  console.log(Buffer.from(b.value.split('.')[1],'base64url').toString())"
```

(`infra/lib/ci-construct.ts`)

**A GitHub Actions deploy can never fix its own OIDC trust policy.**
Corollary of the above: when the deploy role's _own_ trust policy is wrong,
GitHub Actions can't assume it to run `cdk deploy` and fix that same trust
policy — a chicken-and-egg lock-out. Any change to `infra/lib/ci-construct.ts`
that touches the trust condition must be applied with a manual
`cdk deploy --profile <profile>` first; only after that succeeds can CI/CD
resume driving deploys itself.

**AWS session silently expiring mid-session.** `aws login` credentials are short-lived
(auto-rotate ~15 min, valid up to ~12h). If AWS CLI calls start failing with an opaque
"classifier gave no verdict" or similar wrapper error, check for a real
`InvalidClientTokenId` / "session has expired" underneath before assuming a tooling
outage — `aws sts get-caller-identity` is the fastest way to tell. Fix: `aws login
--profile <profile>` again (opens a browser; needs the human to complete it).

**Live site lost styling and auth after a fully green CI/CD run — HTTP status
codes all looked fine.**
Root cause: `VITE_COGNITO_DOMAIN`/`VITE_COGNITO_CLIENT_ID`/`VITE_COGNITO_REGION`
only existed in a local, gitignored `.env` file, never in the repo or in
GitHub Actions. `deploy.yml`'s `npm run build` step ran with those vars unset,
so Vite baked an app bundle where `ensureSignedIn()` (`src/auth.ts`) throws
"Sign-in is not configured" on load — crashing before any rendering, styling
included. A prior manual fix (local `.env` + manual `cdk deploy`) looked
permanent but was silently overwritten by the next automated push. Fix: these
three values aren't secret (they end up in the public browser bundle either
way regardless of how they're injected), so they're set as GitHub Actions
repository **variables**, not secrets:

```sh
gh variable set VITE_COGNITO_DOMAIN --repo TD-SYNNEX/edge-beacon --body "<user pool domain>"
gh variable set VITE_COGNITO_CLIENT_ID --repo TD-SYNNEX/edge-beacon --body "<app client id>"
gh variable set VITE_COGNITO_REGION --repo TD-SYNNEX/edge-beacon --body "<region>"
```

and passed into the build step's `env:` in `.github/workflows/deploy.yml`,
matching the existing `vars.AWS_REGION` pattern already used lower in that
file. **Lesson: verify a deploy by the served bundle's content (hash + a
`grep -c` for an expected string), not just its HTTP status — a 200/401 looks
identical whether the bundle is correct or silently broken.**
(`.github/workflows/deploy.yml`)

## Directory reference

```
.github/workflows/ci.yml       Test/build/e2e on every push and PR
.github/workflows/deploy.yml   Deploy to AWS after ci.yml succeeds on main
infra/                         CDK app (own package.json — separate from the app's)
  lib/edge-beacon-stack.ts     Top-level stack, wires all constructs together
  lib/domain-construct.ts      Route 53 zone + ACM cert (edgebeaconai.com)
  lib/site-construct.ts        S3 + CloudFront (static frontend, custom domain aliases)
  lib/auth-construct.ts        Cognito user pool, groups, app client, Managed Login branding
  lib/api-construct.ts         Lambda (API), Function URL, /api/* CloudFront behavior
  lib/ci-construct.ts          GitHub OIDC provider + scoped deploy role
  lib/assets/                  Managed Login branding JSON + logo PNG (committed, not generated)
server/                        API logic (shared between Worker and Lambda builds)
scripts/build.ts               esbuild: bundles server/ for both Worker and Lambda targets
DEPLOYMENT.md                  This file
README.md                      App overview, local dev, feature docs
```

## Cost note

This is a low-traffic internal tool. Nothing here is provisioned for high scale —
CloudFront/S3/Lambda/Cognito free tiers cover most of normal usage; Route 53 hosted zone
is a small flat monthly fee (~$0.50) plus queries. No NAT gateway, no always-on compute,
no RDS.
