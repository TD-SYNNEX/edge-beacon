import { choice, score } from "@typesafe-ai/sdk";
import { retrieve } from "../../shared/beacon-index.ts";
import type { BeaconKind } from "../../shared/beacon-index.ts";
import type { Jev, JevMeta } from "./client.ts";

/** Where a request should land. `search` = just show ranked results. */
export const INTENTS = {
  open_customer:
    "Look up a specific customer account, its install base, renewals, or opportunities.",
  find_learning:
    "Find a course, certification path, training, or add-on to build skills.",
  practice_lab:
    "Get hands-on: book, launch, or practice in a virtual lab or terminal.",
  match_solution:
    "Find which Cisco solution or use case fits a customer need, or start a discovery brief.",
  program_question:
    "Understand a program rule, policy, benefit, PVI, EA, or API requirement.",
  review_approvals:
    "See pending approvals, agent actions, renewals, or what needs attention today.",
  search:
    "None of the above, or too vague to tell; just show matching results.",
} as const;
export type BeaconIntent = keyof typeof INTENTS;

const RELEVANCE = [
  "Unrelated to what the user is looking for.",
  "Same general area, but does not answer or serve the request.",
  "Useful: a reasonable result for this request.",
  "Exactly what the user is looking for.",
] as const;

/** Tunable in code; changing these does not change what Jev is asked. */
export const SEARCH = { minRelevance: 1.5, minIntentConfidence: 0.5, limit: 8 };

export interface BeaconHit {
  kind: BeaconKind;
  id: string;
  title: string;
  subtitle: string;
  relevance: number;
}

export interface BeaconSearch {
  mode: "jev";
  intent: BeaconIntent;
  intentConfidence: number;
  results: BeaconHit[];
  widened: boolean;
  meta: JevMeta;
}

export async function askBeacon(
  jev: Jev,
  query: string,
  perspective: string,
): Promise<BeaconSearch> {
  const { entries, widened } = retrieve(query);
  const relevance = Object.fromEntries(
    entries.map((e, i) => [
      `r${i}`,
      score(
        {
          result: { kind: e.kind, ...e.content },
          question:
            "How relevant is `result` to the request in `query`, for a user in the role `role`?",
        },
        RELEVANCE,
      ),
    ]),
  );
  // Intent and every relevance judgment are independent: one request.
  const { answers, meta } = await jev.ask(
    { query, role: perspective },
    {
      intent: choice(
        "What is the user in `role` trying to do with the request in `query`?",
        INTENTS,
      ),
      ...relevance,
    },
  );
  const intent = answers.intent;
  const results = entries
    .map((e, i) => ({
      kind: e.kind,
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      relevance: (answers as unknown as Record<string, { score: number }>)[
        `r${i}`
      ].score,
    }))
    .filter((r) => r.relevance >= SEARCH.minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, SEARCH.limit);
  return {
    mode: "jev",
    // Low confidence means "don't steer the user"; just show results.
    intent:
      intent.confidence >= SEARCH.minIntentConfidence
        ? (intent.choice as BeaconIntent)
        : "search",
    intentConfidence: intent.confidence,
    results,
    widened,
    meta,
  };
}
