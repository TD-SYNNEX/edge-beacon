import { noul, score } from "@typesafe-ai/sdk";
import type { Questions } from "@typesafe-ai/sdk";
import { INITIAL_INBOX } from "../../shared/edge-data.ts";
import type {
  InboxItem,
  WorkspacePerspective,
} from "../../shared/edge-types.ts";
import type { Jev, JevMeta } from "./client.ts";

const ROLE: Record<WorkspacePerspective, string> = {
  partner:
    "Partner seller or engineer working their own accounts and certifications",
  sales:
    "Internal Cisco/TD SYNNEX seller responsible for pipeline and renewals",
  practice_leader:
    "Practice leader accountable for team PVI, enablement and approvals",
  admin: "Platform admin who governs agents, integrations and data freshness",
};

/** Composite weights per role. Tune here; answers are reused, not re-asked. */
export const TRIAGE_WEIGHTS: Record<
  WorkspacePerspective,
  { urgency: number; needsMe: number; staleness: number }
> = {
  partner: { urgency: 0.45, needsMe: 0.45, staleness: 0.1 },
  sales: { urgency: 0.55, needsMe: 0.35, staleness: 0.1 },
  practice_leader: { urgency: 0.4, needsMe: 0.4, staleness: 0.2 },
  admin: { urgency: 0.3, needsMe: 0.4, staleness: 0.3 },
};

/** Approval gate thresholds; stakes-scaled starting points, not validated numbers. */
export const GATE = {
  maxAutoBlast: 1.2,
  minRationale: 0.85,
  minMandate: 0.85,
  maxMoney: 0.5,
  minBlastConfidence: 0.5,
};

const URGENCY = [
  "Informational; nothing is lost if it waits a week.",
  "Should be handled this week.",
  "Should be handled today; a deal, renewal or deadline is at stake.",
  "Blocking right now: revenue, a customer commitment or compliance is at immediate risk.",
] as const;
const BLAST = [
  "Internal only: updates a note, draft, or status nobody outside the team sees.",
  "Visible internally: changes a record colleagues rely on, easily undone.",
  "Reaches a customer: sends a message or shares a document externally.",
  "Commercial or contractual: creates a quote, order, price, or commitment.",
] as const;

export type GateRoute = "auto_approve" | "confirm" | "human_review";

export interface TriagedItem {
  id: string;
  rank: number;
  urgency: number;
  needsMe: number;
  why: string;
  gate?: { route: GateRoute; why: string };
}

const STALENESS: Record<InboxItem["freshness"], number> = {
  fresh: 0,
  aging: 0.5,
  stale: 1,
};

export function decideGate(
  item: InboxItem,
  s: {
    blast: number;
    blastConfidence: number;
    rationale: number;
    mandate: number;
    money: number;
  },
): { route: GateRoute; why: string } {
  const d = item.approvalDetails;
  // Hard rules first. No probability overrides an upstream write.
  if (d && d.reversibility !== "Reversible")
    return {
      route: "human_review",
      why: `${d.reversibility}: always a person.`,
    };
  // Fail closed: an incomplete answer is never a reason to act.
  if (!Object.values(s).every(Number.isFinite))
    return { route: "human_review", why: "Jev answer incomplete." };
  if (s.money > GATE.maxMoney)
    return {
      route: "human_review",
      why: "Touches price, quote or contract terms.",
    };
  if (s.rationale < GATE.minRationale)
    return {
      route: "human_review",
      why: `Change is only ${Math.round(s.rationale * 100)}% explained by the agent's stated rationale.`,
    };
  if (s.blastConfidence < GATE.minBlastConfidence)
    return { route: "human_review", why: "Reach of the change is unclear." };
  if (s.blast <= GATE.maxAutoBlast && s.mandate >= GATE.minMandate)
    return {
      route: "auto_approve",
      why: "Reversible, internal, and within the agent's mandate.",
    };
  return {
    route: "confirm",
    why: "Reversible but reaches beyond the team; one click to confirm.",
  };
}

export async function triageInbox(
  jev: Jev,
  perspective: WorkspacePerspective,
  items: readonly InboxItem[] = INITIAL_INBOX,
): Promise<{ mode: "jev"; items: TriagedItem[]; meta: JevMeta }> {
  const questions: Questions = {};
  const state: Record<string, unknown> = { role: ROLE[perspective] };
  items.forEach((item, i) => {
    state[`item${i}`] = {
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      received: item.freshnessLabel,
    };
    questions[`u${i}`] = score(`How urgent is \`item${i}\`?`, URGENCY);
    questions[`n${i}`] = noul(
      `Does \`item${i}\` require a decision or action from the person described in \`role\`?`,
    );
    const d = item.approvalDetails;
    if (!d) return;
    state[`change${i}`] = {
      agent: d.agentName,
      action: d.actionType,
      rationale: d.rationale,
      impact: d.impact,
      before: d.beforeText,
      after: d.afterText,
    };
    questions[`b${i}`] = score(
      `How far does the change in \`change${i}\` reach, from \`before\` to \`after\`?`,
      BLAST,
    );
    questions[`r${i}`] = noul(
      `Is the change from \`before\` to \`after\` in \`change${i}\` fully explained by its \`rationale\` and \`impact\`?`,
    );
    questions[`m${i}`] = noul(
      `Is \`action\` in \`change${i}\` a routine step the agent should take on its own, rather than a judgment call or business commitment?`,
    );
    questions[`c${i}`] = noul(
      `Does \`change${i}\` create or change a price, quote, order, discount, or contractual commitment?`,
    );
  });

  const { answers, meta } = await jev.ask(state as never, questions);
  const a = (key: string) => answers[key] as unknown as Record<string, number>;
  const w = TRIAGE_WEIGHTS[perspective];

  const triaged = items.map((item, i): TriagedItem => {
    const urgency = a(`u${i}`).score;
    const needsMe = a(`n${i}`).noul;
    const rank =
      (urgency / 3) * w.urgency +
      needsMe * w.needsMe +
      STALENESS[item.freshness] * w.staleness;
    const gate = item.approvalDetails
      ? decideGate(item, {
          blast: a(`b${i}`).score,
          blastConfidence: a(`b${i}`).confidence,
          rationale: a(`r${i}`).noul,
          mandate: a(`m${i}`).noul,
          money: a(`c${i}`).noul,
        })
      : undefined;
    return {
      id: item.id,
      rank: Math.round(rank * 100) / 100,
      urgency,
      needsMe,
      why: `${URGENCY[Math.round(urgency)]} ${Math.round(needsMe * 100)}% likely needs you.`,
      ...(gate ? { gate } : {}),
    };
  });
  return {
    mode: "jev",
    items: triaged.sort((x, y) => y.rank - x.rank),
    meta,
  };
}
