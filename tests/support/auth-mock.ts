import type { WorkspacePerspective } from "../../shared/edge-types.ts";

/**
 * Builds an unsigned test token in the shape server/auth.ts accepts under
 * AUTH_TEST_MODE. Never valid outside test config — the CDK Lambda never
 * sets AUTH_TEST_MODE, so this path is structurally unreachable in prod.
 */
export function testToken(
  groups: WorkspacePerspective[],
  sub = "test-user",
): string {
  return (
    "test." + btoa(JSON.stringify({ sub, email: `${sub}@example.com`, groups }))
  );
}

export const AUTH_TEST_ENV = { AUTH_TEST_MODE: "true" };
