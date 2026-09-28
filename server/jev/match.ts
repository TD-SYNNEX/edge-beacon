import { noul, score } from "@typesafe-ai/sdk";
import type { Questions } from "@typesafe-ai/sdk";
import { CATALOG, USE_CASES } from "../../shared/catalog.ts";
import { composeResult } from "../../shared/matcher.ts";
import { terms } from "../../shared/beacon-index.ts";
import type { DiscoveryInput, DiscoveryResult } from "../../shared/types.ts";
import type { Jev, JevMeta } from "./client.ts";

/** Weights live here, not in a prompt. Change one without re-running inference. */
export const WEIGHTS = { addresses: 0.6, fit: 0.3, priority: 0.1 };
export const MATCH = { minScore: 0.35, minUseCase: 1.5, useCasePool: 12 };

const FIT = [
  "Unrelated to the stated need; a partner would not bring this up.",
  "Adjacent: shares a domain but does not touch the problem described.",
  "Plausible: could contribute to the outcome as part of a larger effort.",
  "Directly addresses the specific problem described in the need.",
] as const;
const USE_CASE_FIT = [
  "Not relevant to the described need.",
  "Loosely related; same industry or product area only.",
  "Relevant angle worth raising in discovery.",
  "Closely matches the problem and the systems described.",
] as const;

/** Cheap lexical shortlist of the 375 use cases; Jev ranks what survives. */
export function shortlistUseCases(input: DiscoveryInput) {
  const words = new Set(terms(input.need));
  return USE_CASES.map((u) => ({
    u,
    hits:
      u.keywords.filter((k) => terms(k).some((w) => words.has(w))).length +
      (u.vertical === input.industry ? 1 : 0),
  }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MATCH.useCasePool)
    .map((x) => x.u);
}

export async function jevMatch(
  jev: Jev,
  input: DiscoveryInput,
): Promise<DiscoveryResult & { meta: JevMeta }> {
  // Deployment preference is policy, not judgment: filter in code.
  const eligible = CATALOG.filter(
    (s) =>
      input.deployment === "No preference" ||
      s.deployments.includes(input.deployment),
  );
  const useCases = shortlistUseCases(input);
  const questions: Questions = {};
  for (const s of eligible) {
    const solution = {
      name: s.name,
      summary: s.summary,
      outcome: s.outcome,
      automations: s.automations,
    };
    questions[`a_${s.id}`] = noul(
      {
        solution,
        question: "Would `solution` help with the problem described in `need`?",
      },
      {
        true: "The solution's outcome or automations act on the problem the customer described.",
        false:
          "The solution targets a different problem, even if it is in a related technology area.",
      },
    );
    questions[`f_${s.id}`] = score(
      { solution, question: "How directly does `solution` address `need`?" },
      FIT,
    );
  }
  for (const u of useCases)
    questions[`u_${u.id}`] = score(
      {
        use_case: {
          deliverable: u.deliverable,
          vertical: u.vertical,
          problem: u.problem,
          automation: u.automation,
        },
        question: "How relevant is `use_case` as a starting angle for `need`?",
      },
      USE_CASE_FIT,
    );

  // Account alias is never sent: it is not needed for matching.
  const { answers, meta } = await jev.ask(
    {
      need: input.need,
      industry: input.industry,
      stated_priority: input.priority,
      practice_stage: input.readiness,
    },
    questions,
  );
  const num = (key: string, field: "noul" | "score") =>
    (answers[key] as unknown as Record<string, number>)[field];

  const matches = eligible
    .map((s) => {
      const addresses = num(`a_${s.id}`, "noul");
      const fitLevel = Math.round(num(`f_${s.id}`, "score"));
      const priority = s.priorities.includes(input.priority) ? 1 : 0;
      return {
        id: s.id,
        total:
          addresses * WEIGHTS.addresses +
          (fitLevel / (FIT.length - 1)) * WEIGHTS.fit +
          priority * WEIGHTS.priority,
        reason:
          `${Math.round(addresses * 100)}% likely to address the need. ${FIT[fitLevel]}` +
          (priority
            ? ` Supports the goal to ${input.priority.toLowerCase()}.`
            : ""),
      };
    })
    .filter((m) => m.total >= MATCH.minScore)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const useCaseMatches = useCases
    .map((u) => ({ u, rel: num(`u_${u.id}`, "score") }))
    .filter((x) => x.rel >= MATCH.minUseCase)
    .sort((a, b) => b.rel - a.rel)
    .slice(0, 5)
    .map(({ u, rel }) => ({
      id: u.id,
      reason: `${u.productLine} use case for ${u.vertical}. ${USE_CASE_FIT[Math.round(rel)]}`,
    }));

  return {
    ...composeResult(
      input,
      "jev",
      matches.map(({ id, reason }) => ({ id, reason })),
      useCaseMatches,
    ),
    meta,
  };
}
