import { CATALOG, USE_CASES } from "./catalog.ts";
import {
  COURSES_DATA,
  CUSTOMERS_DATA,
  PROGRAM_QUESTIONS_DATA,
  VIRTUAL_LABS_DATA,
} from "./edge-data.ts";

/** Everything a Cisco practice user can find from the one Beacon search box. */
export type BeaconKind =
  "customer" | "course" | "lab" | "solution" | "use_case" | "answer";

export interface BeaconEntry {
  kind: BeaconKind;
  id: string;
  title: string;
  subtitle: string;
  /** Only the fields a relevance judgment needs; also the lexical haystack. */
  content: Record<string, string | string[]>;
}

export const KIND_LABELS: Record<BeaconKind, string> = {
  customer: "Customers (Customer 360)",
  course: "Courses & add-ons",
  lab: "Virtual labs",
  solution: "Cisco solutions",
  use_case: "Use cases",
  answer: "Program answers",
};

export const BEACON_INDEX: readonly BeaconEntry[] = [
  ...CUSTOMERS_DATA.map((c) => ({
    kind: "customer" as const,
    id: c.id,
    title: c.company,
    subtitle: `${c.guName} · ${c.healthBand} (${c.healthScore}/10)`,
    content: {
      company: c.company,
      health: c.healthBand,
      tags: c.tags,
      opportunities: c.openOpportunityCards.map((o) => o.title),
    },
  })),
  ...COURSES_DATA.map((c) => ({
    kind: "course" as const,
    id: c.id,
    title: c.title,
    subtitle: `${c.portfolio} · ${c.format} · ${c.pviImpact}`,
    content: {
      title: c.title,
      portfolio: c.portfolio,
      description: c.description,
      pvi: c.pviDimension,
    },
  })),
  ...VIRTUAL_LABS_DATA.map((l) => ({
    kind: "lab" as const,
    id: l.id,
    title: l.title,
    subtitle: `${l.category} · ${l.durationHours}h · ${l.topology}`,
    content: {
      title: l.title,
      category: l.category,
      topology: l.topology,
      devices: l.devices,
    },
  })),
  ...CATALOG.map((s) => ({
    kind: "solution" as const,
    id: s.id,
    title: s.name,
    subtitle: `${s.category} · ${s.outcome}`,
    content: {
      name: s.name,
      summary: s.summary,
      outcome: s.outcome,
      products: s.products,
    },
  })),
  ...USE_CASES.map((u) => ({
    kind: "use_case" as const,
    id: u.id,
    title: u.deliverable,
    subtitle: `${u.productLine} · ${u.vertical}`,
    content: {
      deliverable: u.deliverable,
      vertical: u.vertical,
      problem: u.problem,
      automation: u.automation,
      keywords: u.keywords,
    },
  })),
  ...PROGRAM_QUESTIONS_DATA.map((q) => ({
    kind: "answer" as const,
    id: q.id,
    title: q.question,
    subtitle: `${q.category} · ${q.freshness}`,
    content: { question: q.question, category: q.category, answer: q.answer },
  })),
];

const STOP = new Set(
  "a an and are as at be by can do does for from how i in is it me my of on or our the to what when where which who why with you".split(
    " ",
  ),
);
export const terms = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));

const haystacks = new Map(
  BEACON_INDEX.map((e) => [
    e,
    (e.title + " " + Object.values(e.content).flat().join(" ")).toLowerCase(),
  ]),
);

/** Count of query terms found in an entry; title hits count double. */
export function lexicalHits(entry: BeaconEntry, query: string): number {
  const hay = haystacks.get(entry) ?? "";
  const title = entry.title.toLowerCase();
  return terms(query).reduce(
    (sum, t) => sum + (hay.includes(t) ? 1 : 0) + (title.includes(t) ? 1 : 0),
    0,
  );
}

/**
 * Cheap retrieval. Returns the lexical top-N; when fewer than `minStrong`
 * entries share a word with the query, `widened` tells the caller that
 * lexical search found too little and semantic ranking must do the work.
 */
export function retrieve(
  query: string,
  { limit = 20, minStrong = 3 }: { limit?: number; minStrong?: number } = {},
) {
  const scored = BEACON_INDEX.map((entry) => ({
    entry,
    hits: lexicalHits(entry, query),
  }));
  const strong = scored.filter((s) => s.hits > 0);
  const widened = strong.length < minStrong;
  // ponytail: widening falls back to a kind-balanced sample (not all 400+ entries), rerank on embeddings if recall matters
  const pool = widened
    ? [
        ...strong,
        ...scored.filter((s) => s.hits === 0 && s.entry.kind !== "use_case"),
      ]
    : strong;
  return {
    widened,
    entries: pool
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((s) => ({ ...s.entry, hits: s.hits })),
  };
}
