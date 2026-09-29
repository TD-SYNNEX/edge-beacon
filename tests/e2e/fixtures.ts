import { test as base, expect } from "@playwright/test";

/**
 * Pre-authenticates every page before the app's own scripts run, so specs
 * exercise the real workspace instead of the Hosted UI redirect. Mirrors the
 * storage shape src/auth.ts reads and the unsigned test-token shape
 * server/auth.ts accepts under AUTH_TEST_MODE (set in playwright.config.ts's
 * webServer.env) — never reachable in a deployed environment, since the CDK
 * Lambda config never sets that flag.
 */
export function testToken(groups: readonly string[], sub = "e2e-user"): string {
  const payload = { sub, email: `${sub}@example.com`, groups };
  return "test." + Buffer.from(JSON.stringify(payload)).toString("base64");
}

const DEFAULT_GROUPS = [
  "partner",
  "sales",
  "practice_leader",
  "admin",
] as const;

export const test = base.extend<{ signedIn: void }>({
  signedIn: [
    async ({ page }, use) => {
      const groups = DEFAULT_GROUPS;
      const token = testToken(groups);
      await page.addInitScript(
        ([token, groups]) => {
          window.sessionStorage.setItem(
            "eb-auth-v1",
            JSON.stringify({
              idToken: token,
              accessToken: token,
              expiresAt: Date.now() + 60 * 60 * 1000,
              groups,
            }),
          );
          document.cookie = "eb_session=1; Path=/";
        },
        [token, groups] as const,
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
