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
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const errorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => (error instanceof Error ? error.message : fallback);
