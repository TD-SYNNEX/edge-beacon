import type { WorkspacePerspective } from "../shared/edge-types.ts";
import { showLanding } from "./landing.ts";

/**
 * Cognito Hosted UI sign-in (authorization code + PKCE, public client, no
 * secret). Tokens live in sessionStorage — tab-scoped, cleared on close —
 * kept separate from the "tds-accelerator-v1" localStorage prefs key so a
 * stolen/replayed preference blob can never carry a token. The real
 * authorization boundary is the API's JWT verification (server/auth.ts);
 * this module only decides whether the browser has something to send it.
 */

const PERSPECTIVES: readonly WorkspacePerspective[] = [
  "partner",
  "sales",
  "practice_leader",
  "admin",
];
const STORAGE_KEY = "eb-auth-v1";
const PENDING_KEY = "eb-auth-pending-v1";
/** Non-secret presence flag only, read by the CloudFront edge gate. Never holds a token. */
const SESSION_COOKIE = "eb_session";

interface AuthConfig {
  domain: string;
  clientId: string;
  region: string;
}
interface StoredAuth {
  idToken: string;
  accessToken: string;
  expiresAt: number;
  groups: WorkspacePerspective[];
}

function config(): AuthConfig | undefined {
  const env = import.meta.env;
  const domain = env.VITE_COGNITO_DOMAIN as string | undefined;
  const clientId = env.VITE_COGNITO_CLIENT_ID as string | undefined;
  const region = env.VITE_COGNITO_REGION as string | undefined;
  return domain && clientId && region
    ? { domain, clientId, region }
    : undefined;
}
const hostedUiBase = (cfg: AuthConfig) =>
  `https://${cfg.domain}.auth.${cfg.region}.amazoncognito.com`;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}
function decodeGroups(idToken: string): WorkspacePerspective[] {
  try {
    const part = idToken.split(".")[1] ?? "";
    const payload: unknown = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/")),
    );
    const raw =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)["cognito:groups"]
        : undefined;
    return PERSPECTIVES.filter((p) => Array.isArray(raw) && raw.includes(p));
  } catch {
    return [];
  }
}

function readStored(): StoredAuth | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as StoredAuth).idToken !== "string" ||
      typeof (parsed as StoredAuth).expiresAt !== "number"
    )
      return undefined;
    return parsed as StoredAuth;
  } catch {
    return undefined;
  }
}
function writeStored(auth: StoredAuth): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    const maxAge = Math.max(
      0,
      Math.round((auth.expiresAt - Date.now()) / 1000),
    );
    document.cookie = `${SESSION_COOKIE}=1; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
  } catch {
    /* Session storage unavailable: the next check finds no valid token and re-gates. */
  }
}
function clearStored(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  document.cookie = `${SESSION_COOKIE}=; Max-Age=0; Path=/`;
}
const isValid = (auth: StoredAuth | undefined): auth is StoredAuth =>
  !!auth && auth.expiresAt > Date.now();

async function redirectToSignIn(cfg: AuthConfig, target = ""): Promise<never> {
  const verifier = randomToken();
  const state = randomToken();
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ verifier, state, target }),
    );
  } catch {}
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: window.location.origin + "/",
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    state,
  });
  window.location.assign(`${hostedUiBase(cfg)}/oauth2/authorize?${params}`);
  return new Promise<never>(() => {}); // navigating away; never resolves
}

async function exchangeCode(
  cfg: AuthConfig,
  code: string,
  state: string,
): Promise<string | false> {
  let pending: { verifier: string; state: string; target?: string } | undefined;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    pending = raw ? JSON.parse(raw) : undefined;
  } catch {}
  if (!pending || pending.state !== state) return false;
  const response = await fetch(`${hostedUiBase(cfg)}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code,
      redirect_uri: window.location.origin + "/",
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    expires_in?: number;
  };
  if (!body.id_token || !body.access_token || !body.expires_in) return false;
  writeStored({
    idToken: body.id_token,
    accessToken: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
    groups: decodeGroups(body.id_token),
  });
  return pending.target ?? ""; // route the user asked for before signing in
}

/**
 * Ensures a signed-in session exists before the workspace renders. Handles a
 * returning `?code=` from Hosted UI. Otherwise a deep link redirects to Hosted
 * UI, and a bare "/" shows the public home page; either way it never returns.
 * Call once, before any rendering.
 */
export async function ensureSignedIn(): Promise<void> {
  if (isValid(readStored())) return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cfg = config();
  let failed = false;
  if (cfg && code && state) {
    const target = await exchangeCode(cfg, code, state);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    if (target !== false) url.hash = target;
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    if (target !== false) return;
    failed = true;
  }
  if (!cfg)
    throw new Error(
      "Sign-in is not configured (VITE_COGNITO_DOMAIN/CLIENT_ID/REGION missing).",
    );
  // A deep link into the workspace signs in at once; the home page is public.
  if (window.location.hash.length > 1)
    await redirectToSignIn(cfg, window.location.hash);
  showLanding(
    (hash) => void redirectToSignIn(cfg, hash),
    failed ? "Sign-in did not complete. Please try again." : undefined,
  );
  return new Promise<never>(() => {}); // the workspace stays unrendered until sign-in
}

export const getAuthHeader = (): string | undefined => {
  const auth = readStored();
  return isValid(auth) ? `Bearer ${auth.idToken}` : undefined;
};

/** The signed-in user's actual Cognito groups. Display/UI only — never an authorization check. */
export const getGroups = (): WorkspacePerspective[] => {
  const auth = readStored();
  return isValid(auth) ? auth.groups : [];
};

export function signOut(): void {
  clearStored();
  const cfg = config();
  if (!cfg) {
    window.location.reload();
    return;
  }
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    logout_uri: window.location.origin + "/",
  });
  window.location.assign(`${hostedUiBase(cfg)}/logout?${params}`);
}
