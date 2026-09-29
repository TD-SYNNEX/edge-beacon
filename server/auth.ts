import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Identity, ServerEnv } from "../shared/types.ts";
import type { WorkspacePerspective } from "../shared/edge-types.ts";

const PERSPECTIVES: readonly WorkspacePerspective[] = [
  "partner",
  "sales",
  "practice_leader",
  "admin",
];

const groupsOf = (value: unknown): WorkspacePerspective[] => {
  const raw = Array.isArray(value) ? value : [];
  return PERSPECTIVES.filter((p) => raw.includes(p));
};

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;
const getVerifier = (env: ServerEnv) => {
  if (!verifier) {
    if (!env.COGNITO_USER_POOL_ID || !env.COGNITO_CLIENT_ID)
      throw new Error("Cognito is not configured.");
    verifier = CognitoJwtVerifier.create({
      userPoolId: env.COGNITO_USER_POOL_ID,
      tokenUse: "id",
      clientId: env.COGNITO_CLIENT_ID,
    });
  }
  return verifier;
};

/**
 * ponytail: unsigned test-token path, only reachable when AUTH_TEST_MODE="true".
 * The CDK Lambda config never sets that env var, so this is structurally
 * unreachable in production. It exists so unit/e2e tests exercise this app's
 * own group/precedence logic without a live Cognito user pool.
 */
const TEST_PREFIX = "test.";
const verifyTestToken = (token: string): Identity | undefined => {
  if (!token.startsWith(TEST_PREFIX)) return undefined;
  try {
    const payload: unknown = JSON.parse(atob(token.slice(TEST_PREFIX.length)));
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { sub?: unknown }).sub !== "string"
    )
      return undefined;
    const p = payload as { sub: string; email?: unknown; groups?: unknown };
    return {
      sub: p.sub,
      email: typeof p.email === "string" ? p.email : undefined,
      groups: groupsOf(p.groups),
    };
  } catch {
    return undefined;
  }
};

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return undefined;
  return header.slice(7).trim();
}

/**
 * Verifies the caller on every /api/* request. Returns the identity on
 * success, or a ready-to-return 401 Response on failure — callers never see
 * provider/verification error detail.
 */
export async function requireAuth(
  request: Request,
  env: ServerEnv,
): Promise<Identity | Response> {
  const unauthorized = () =>
    new Response(JSON.stringify({ message: "Sign in to use this API." }), {
      status: 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  const token = bearerToken(request);
  if (!token) return unauthorized();
  if (env.AUTH_TEST_MODE === "true") {
    const identity = verifyTestToken(token);
    return identity ?? unauthorized();
  }
  try {
    const payload = await getVerifier(env).verify(token);
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      groups: groupsOf(payload["cognito:groups"]),
    };
  } catch {
    return unauthorized();
  }
}

/** admin > practice_leader > sales > partner. Used when the client omits a perspective. */
const PRECEDENCE: WorkspacePerspective[] = [
  "admin",
  "practice_leader",
  "sales",
  "partner",
];

export function defaultPerspective(
  identity: Identity,
): WorkspacePerspective | undefined {
  return PRECEDENCE.find((p) => identity.groups.includes(p));
}

/**
 * Denies escalation only: a client-requested "sales" role is downgraded to
 * "partner" unless the verified identity actually holds a sales-adjacent
 * group. A requested "partner" role is never upgraded — that's the client's
 * own choice, not a privilege check.
 */
export function clampRole(
  role: "partner" | "sales",
  identity: Identity,
): "partner" | "sales" {
  if (role !== "sales") return role;
  const salesAdjacent: WorkspacePerspective[] = [
    "sales",
    "practice_leader",
    "admin",
  ];
  return identity.groups.some((g) => salesAdjacent.includes(g))
    ? "sales"
    : "partner";
}
