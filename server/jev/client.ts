import { TypeSafeClient } from "@typesafe-ai/sdk";
import type {
  EntryType,
  Fetch,
  Questions,
  SystemOneResult,
} from "@typesafe-ai/sdk";
import type { ServerEnv } from "../../shared/types.ts";

/** Jev runs only when explicitly enabled with a server-side key. */
export const jevReady = (env: ServerEnv) =>
  env.JEV_ENABLED === "true" &&
  typeof env.TYPESAFE_API_KEY === "string" &&
  env.TYPESAFE_API_KEY.trim().length > 0;

export interface JevMeta {
  model: string;
  elapsedMs: number;
  asked: number;
}

export interface Jev {
  ask<const Q extends Questions>(
    state: EntryType,
    questions: Q,
  ): Promise<SystemOneResult<Q> & { meta: JevMeta }>;
}

/**
 * One request, many questions: every question sees the same state and is
 * answered independently, so batching is free parallelism.
 * `fetch` is injectable so tests run offline against a stub.
 */
export function createJev(env: ServerEnv, fetch?: Fetch): Jev {
  const client = new TypeSafeClient({
    apiKey: env.TYPESAFE_API_KEY,
    defaultModel: env.TYPESAFE_MODEL || "jev-latest",
    timeout: 15_000,
    logLevel: "off",
    ...(fetch ? { fetch } : {}),
  });
  return {
    async ask(state, questions) {
      const started = Date.now();
      const result = await client.systemOne({ state, questions });
      return {
        ...result,
        meta: {
          model: result.model,
          elapsedMs: Date.now() - started,
          asked: Object.keys(questions).length,
        },
      };
    },
  };
}
