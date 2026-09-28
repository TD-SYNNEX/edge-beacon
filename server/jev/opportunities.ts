import { choice, noul, score } from "@typesafe-ai/sdk";
import type { Questions } from "@typesafe-ai/sdk";
import type { Customer360 } from "../../shared/edge-types.ts";
import type { Jev, JevMeta } from "./client.ts";

type Category = Customer360["openOpportunityCards"][number]["category"];

const CATEGORIES: Record<Category, string> = {
  Renewal:
    "A support contract or subscription is expiring and should be renewed.",
  "EoL Refresh":
    "Hardware is at or near end-of-life/LDoS and should be replaced.",
  "Security Attach":
    "Add security products or services to an existing deployment.",
  "EA Expansion":
    "Grow an Enterprise Agreement, true-forward, or add suites to it.",
};
const EVIDENCE = [
  "No supporting evidence in the account data.",
  "Weak: plausible, but the account data barely mentions it.",
  "Moderate: some install base or contract facts point to it.",
  "Strong: specific devices, dates or contracts in the data directly show it.",
] as const;

/** Below this, the card is flagged for a human to verify before it is worked. */
export const OPPORTUNITY = { minSupported: 0.6, minEvidence: 1.5 };

export interface CheckedOpportunity {
  id: string;
  suggestedCategory: Category;
  categoryConfidence: number;
  categoryMatches: boolean;
  evidence: number;
  supported: number;
  verdict: "grounded" | "verify";
}

export async function checkOpportunities(
  jev: Jev,
  customer: Customer360,
): Promise<{ mode: "jev"; cards: CheckedOpportunity[]; meta: JevMeta }> {
  const cards = customer.openOpportunityCards;
  if (!cards.length)
    return {
      mode: "jev",
      cards: [],
      meta: { model: "", elapsedMs: 0, asked: 0 },
    };
  const state: Record<string, unknown> = {
    account: {
      company: customer.company,
      active_enterprise_agreement: customer.activeEa,
      ea_true_forward_estimate: customer.eaTrueForwardEstimate,
      meraki_devices: customer.merakiDevices,
      webex_licenses: customer.webexLicenses,
      install_base: customer.installBase.map(
        ({ pid, family, site, ldos, contract, status }) => ({
          pid,
          family,
          site,
          ldos,
          contract,
          status,
        }),
      ),
    },
  };
  const questions: Questions = {};
  cards.forEach((card, i) => {
    state[`card${i}`] = {
      title: card.title,
      value: card.value,
      evidence: card.evidence,
    };
    questions[`k${i}`] = choice(
      `What kind of opportunity is \`card${i}\`?`,
      CATEGORIES,
    );
    questions[`e${i}`] = score(
      `How strongly does the data in \`account\` support the opportunity in \`card${i}\`?`,
      EVIDENCE,
    );
    questions[`s${i}`] = noul(
      `Are the facts claimed in \`card${i}.evidence\` consistent with the data in \`account\`?`,
    );
  });
  const { answers, meta } = await jev.ask(state as never, questions);
  const a = (key: string) =>
    answers[key] as unknown as Record<string, number> & { choice: Category };

  return {
    mode: "jev",
    meta,
    cards: cards.map((card, i) => {
      const kind = a(`k${i}`);
      const evidence = a(`e${i}`).score;
      const supported = a(`s${i}`).noul;
      return {
        id: card.id,
        suggestedCategory: kind.choice,
        categoryConfidence: kind.confidence,
        categoryMatches: kind.choice === card.category,
        evidence,
        supported,
        verdict:
          supported >= OPPORTUNITY.minSupported &&
          evidence >= OPPORTUNITY.minEvidence
            ? "grounded"
            : "verify",
      };
    }),
  };
}
