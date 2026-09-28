import type { CatalogMatch, DiscoveryInput, DiscoveryResult } from "./types.ts";
import { CATALOG, USE_CASES } from "./catalog.ts";

const normalize = (text: string) =>
  String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "");
const contains = (text: string, word: string) =>
  new RegExp(
    "(?:^|[^a-z0-9])" +
      word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "(?:$|[^a-z0-9])",
    "i",
  ).test(text);

export function matchSolutions(input: DiscoveryInput): DiscoveryResult {
  const text = normalize(input.need);
  const matches = CATALOG.map((solution) => {
    const terms = solution.keywords.filter((term) => contains(text, term));
    const reasons = [];
    let score = terms.length * 4;
    if (terms.length)
      reasons.push(
        "Matches your description: " + terms.slice(0, 3).join(", ") + ".",
      );
    if (solution.priorities.includes(input.priority)) {
      score += 5;
      reasons.push(
        "Supports your goal to " + input.priority.toLowerCase() + ".",
      );
    }
    if (solution.industries.includes(input.industry)) {
      score += 1;
    }
    const compatible =
      !input.deployment ||
      input.deployment === "No preference" ||
      solution.deployments.includes(input.deployment);
    if (!compatible) return null;
    // Industry context alone is insufficient evidence for a recommendation.
    if (!terms.length && !solution.priorities.includes(input.priority))
      return null;
    return { id: solution.id, score, reason: reasons.join(" "), terms };
  })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const useCaseMatches = USE_CASES.map((useCase) => {
    const terms = useCase.keywords.filter((term) => contains(text, term));
    return terms.length
      ? {
          id: useCase.id,
          score: terms.length * 3,
          reason: `${useCase.productLine} use case for ${useCase.vertical}; matches ${terms.slice(0, 3).join(", ")}.`,
        }
      : null;
  })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return composeResult(
    input,
    "guided",
    matches.map(({ id, reason }) => ({ id, reason })),
    useCaseMatches.map(({ id, reason }) => ({ id, reason })),
  );
}

/** Shared by keyword and Jev matching: questions, steps and tier come from the catalog, not a model. */
export function composeResult(
  input: DiscoveryInput,
  mode: DiscoveryResult["mode"],
  matches: CatalogMatch[],
  useCaseMatches: CatalogMatch[],
): DiscoveryResult {
  const tier =
    input.readiness === "Established practice"
      ? "Scale"
      : input.readiness === "Building a practice"
        ? "Build"
        : "Explore";
  const first = CATALOG.find((s) => s.id === matches[0]?.id);
  const generic = [
    "Which task or customer problem should change first?",
    "Which Cisco platforms or business systems are in use?",
    "What would a successful pilot demonstrate?",
  ];
  return {
    mode,
    summary: matches.length
      ? "These catalog options match the needs and priorities you provided. Use the questions below to narrow the first pilot."
      : "There is not enough information to recommend a catalog solution yet. Add the task, systems involved, or the result you want.",
    matches,
    useCaseMatches,
    questions: first ? first.questions : generic,
    nextSteps: first
      ? [
          "Confirm the problem, systems, and success measure.",
          "Review the " +
            first.name +
            " prerequisites with the solutions team.",
          "Scope one pilot and assign an owner before scheduling delivery.",
        ]
      : [
          "Clarify one customer need.",
          "Identify the systems and people involved.",
          "Use the catalog to choose a discovery starting point.",
        ],
    tier,
    assumptions: [
      "Recommendations are based on the program catalog; delivery availability must be confirmed.",
      ...(input.deployment === "On-premises" || input.deployment === "Hybrid"
        ? [
            "Validate model hosting, integrations, and operating responsibilities for the selected environment.",
          ]
        : []),
    ],
  };
}

export function createBrief(
  input: DiscoveryInput,
  result: DiscoveryResult | null,
  selectedIds: string[],
  notes = "",
) {
  const solutions = selectedIds
    .map((id) => CATALOG.find((s) => s.id === id))
    .filter((item) => item !== undefined);
  const lines = [
    "# TD SYNNEX · Cisco AI Partner Accelerator",
    "## Discovery brief",
    "**Status:** Draft for review",
    "**Prepared:** " + new Date().toISOString().slice(0, 10),
    "**Prepared for:** " + (input.account?.trim() || "Account to confirm"),
    "**Perspective:** " +
      (input.role === "sales" ? "Internal sales" : "Partner"),
    "**Source:** " +
      (result?.mode === "ai"
        ? "AI-assisted discovery using the program catalog"
        : "Guided catalog matching and user selections"),
    "",
    "## Customer need",
    input.need?.trim() || "To be confirmed in discovery.",
    "",
    "## Discovery context",
    "- Industry: " + (input.industry || "To confirm"),
    "- Priority: " + (input.priority || "To confirm"),
    "- Deployment preference: " + (input.deployment || "To confirm"),
    "- Practice stage: " + (input.readiness || "To confirm"),
    "- Timing: " + (input.timing || "To confirm"),
    "",
    "## Shortlisted solutions",
  ];
  for (const solution of solutions) {
    lines.push("", "### " + solution.name, solution.outcome);
    const match = result?.matches?.find((m) => m.id === solution.id);
    if (match) lines.push("Why considered: " + match.reason);
    lines.push(
      "Potential automation: " + solution.automations.join("; ") + ".",
      "Prerequisites: " + solution.requirements.join("; ") + ".",
    );
    if (input.role === "sales")
      lines.push("Conversation starter: " + solution.sales);
  }
  if (!solutions.length) lines.push("No solutions selected yet.");
  if (result?.useCaseMatches?.length) {
    lines.push("", "## Use-case angles to explore");
    for (const match of result.useCaseMatches.slice(0, 5)) {
      const useCase = USE_CASES.find((item) => item.id === match.id);
      if (useCase)
        lines.push(
          "- " +
            useCase.deliverable +
            " (" +
            useCase.vertical +
            "): " +
            match.reason,
        );
    }
  }
  lines.push(
    "",
    "## Questions to resolve",
    ...(
      result?.questions || ["What would a successful pilot demonstrate?"]
    ).map((q) => "- " + q),
  );
  lines.push(
    "",
    "## Proposed next steps",
    ...(
      result?.nextSteps || [
        "Confirm fit and scope with the solutions team.",
        "Choose a pilot owner and success measure.",
      ]
    ).map((s, i) => i + 1 + ". " + s),
  );
  if (notes.trim())
    lines.push("", "## Additional discovery notes", notes.trim());
  lines.push(
    "",
    "## Items to confirm",
    ...(
      result?.assumptions || [
        "Delivery availability and implementation scope require confirmation.",
      ]
    ).map((a) => "- " + a),
    "- Confirm commercial pricing, licenses, data requirements, and delivery dates separately.",
    "- No request, booking, CRM update, or deployment has been submitted by this brief.",
  );
  return lines.join("\n");
}
