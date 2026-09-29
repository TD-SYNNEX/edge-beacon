import type { WorkspacePerspective } from "./edge-types.ts";

export type Role = "partner" | "sales";
export type LearningRole = "sales" | "technical" | "builder";
export type Tier = "Explore" | "Build" | "Scale";

export interface DiscoveryInput {
  role: Role;
  need: string;
  industry: string;
  priority: string;
  deployment: string;
  readiness: string;
  account: string;
  timing: string;
}

export interface CatalogMatch {
  id: string;
  reason: string;
}
export interface DiscoveryResult {
  mode: "guided" | "ai" | "jev";
  summary: string;
  matches: CatalogMatch[];
  useCaseMatches: CatalogMatch[];
  questions: string[];
  nextSteps: string[];
  tier: Tier;
  assumptions: string[];
}

export interface Solution {
  id: string;
  name: string;
  category: string;
  icon: string;
  summary: string;
  outcome: string;
  automations: string[];
  products: string[];
  deployments: string[];
  keywords: string[];
  priorities: string[];
  industries: string[];
  requirements: string[];
  questions: string[];
  sales: string;
  pilot: string;
  production: string;
  onprem: string;
  onpremRun: string;
  whiteLabel: boolean;
  track: string;
}

export interface UseCase {
  id: string;
  productLine: string;
  vertical: string;
  icon: string;
  deliverable: string;
  title: string;
  problem: string;
  automation: string;
  outcome: string;
  systems: string;
  keywords: string[];
  discovery: string[];
}

export interface LearningTrack {
  title: string;
  products: string;
  icon: string;
  sales: string;
  technical: string;
  builder: string;
}

export interface ServerEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_ENABLED?: string;
  TYPESAFE_API_KEY?: string;
  TYPESAFE_MODEL?: string;
  JEV_ENABLED?: string;
  /** Cognito user pool the API verifies bearer tokens against. Plain config, not secret. */
  COGNITO_USER_POOL_ID?: string;
  COGNITO_CLIENT_ID?: string;
  COGNITO_REGION?: string;
  /** ARN of the combined provider-keys secret; unset in local dev, set by the CDK Lambda config. */
  SECRETS_ARN?: string;
  /** Only ever "true" in test config. Swaps real Cognito JWT verification for an unsigned test token. */
  AUTH_TEST_MODE?: string;
  /**
   * Set by the CDK Lambda config; CloudFront always attaches this header
   * when forwarding to the origin. Rejects a request straight to the raw
   * Function URL, bypassing CloudFront, before the Cognito JWT check runs.
   * Unset in local dev, where there's no CloudFront in front of the API.
   */
  ORIGIN_SHARED_SECRET?: string;
}

/** A verified caller, derived from a Cognito ID token. Never trust a client-sent equivalent instead. */
export interface Identity {
  sub: string;
  email?: string;
  /** Cognito groups the token actually carries, intersected against the 4 known perspectives. */
  groups: WorkspacePerspective[];
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const errorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => (error instanceof Error ? error.message : fallback);
