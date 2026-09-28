/**
 * Offline stand-in for the TypeSafe API so the lab runs without a key.
 *
 * ponytail: lexical-overlap stub, not a model. It produces deterministic,
 * directionally-sensible numbers so you can exercise the wiring, thresholds
 * and composition logic. Set TYPESAFE_API_KEY to use the real thing; every
 * call site is identical either way.
 */
const STOP = new Set(
  "a an and are as at be by does do for from has have how in is it its of on or that the this to was what when which who will with your you".split(
    " ",
  ),
);

const words = (value: unknown): string[] => {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? "") || "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2 && !STOP.has(word));
};

/** Share of the question's content words that also appear in the state. */
const overlap = (question: unknown, state: unknown): number => {
  const asked = new Set(words(question));
  if (!asked.size) return 0;
  const known = new Set(words(state));
  let hits = 0;
  for (const word of asked) if (known.has(word)) hits += 1;
  return hits / asked.size;
};

/** Squash a raw overlap ratio into a usable 0..1 probability. */
const squash = (ratio: number) => Math.min(0.97, Math.max(0.03, ratio * 2.4));

/** Deterministic 0..1 from a string, used only to break stub ties. */
const jitter = (seed: unknown): number => {
  const text = JSON.stringify(seed ?? "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
};

const distribute = (weights: number[], seeds: unknown[] = []): number[] => {
  const floored = weights.map(
    (weight, index) =>
      (Math.max(weight, 0.01) + jitter(seeds[index]) * 0.08) ** 2,
  );
  const total = floored.reduce((sum, weight) => sum + weight, 0);
  return floored.map((weight) => weight / total);
};

/** Peakedness of the distribution, on the same 0..1 axis as real confidence. */
const confidenceOf = (probabilities: number[]): number => {
  if (probabilities.length < 2) return 1;
  const sorted = [...probabilities].sort((a, b) => b - a);
  return Math.round(Math.min(1, (sorted[0] - sorted[1]) * 1.6) * 100) / 100;
};

const round = (value: number) => Math.round(value * 100) / 100;

function answer(question: Record<string, unknown>, state: unknown) {
  const { type, instructions, criteria } = question;
  if (type === "noul") {
    const criteriaRecord =
      criteria && typeof criteria === "object"
        ? (criteria as Record<string, unknown>)
        : {};
    const yes = squash(
      Math.max(
        overlap(instructions, state),
        overlap(criteriaRecord.true, state) * 0.9,
      ),
    );
    const no = overlap(criteriaRecord.false, state);
    return { type: "noul", noul: round(Math.max(0.02, yes - no * 0.5)) };
  }
  if (type === "choice") {
    const labels = Object.keys(criteria as Record<string, unknown>);
    const probabilities = distribute(
      labels.map((label) =>
        Math.max(
          overlap(label, state),
          overlap((criteria as Record<string, unknown>)[label], state),
        ),
      ),
      labels,
    );
    const best = probabilities.indexOf(Math.max(...probabilities));
    return {
      type: "choice",
      choice: labels[best],
      confidence: confidenceOf(probabilities),
      probabilities: Object.fromEntries(
        labels.map((label, index) => [label, round(probabilities[index])]),
      ),
    };
  }
  const levels = criteria as unknown[];
  const probabilities = distribute(
    levels.map((level) => overlap(level, state)),
    levels.map((level) => [level, instructions]),
  );
  return {
    type: "score",
    score: round(
      probabilities.reduce((sum, weight, index) => sum + weight * index, 0),
    ),
    confidence: confidenceOf(probabilities),
    legend: Object.fromEntries(levels.map((level, index) => [index, level])),
    probabilities: Object.fromEntries(
      levels.map((_, index) => [index, round(probabilities[index])]),
    ),
  };
}

export const mockFetch = async (
  _input: string,
  init?: RequestInit,
): Promise<Response> => {
  let payload: { state?: unknown; questions?: Record<string, unknown> };
  try {
    payload = JSON.parse(String(init?.body ?? "{}"));
  } catch {
    return new Response(JSON.stringify({ error: "bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const questions = payload.questions ?? {};
  const answers = Object.fromEntries(
    Object.entries(questions).map(([id, question]) => [
      id,
      answer(question as Record<string, unknown>, payload.state),
    ]),
  );
  return new Response(
    JSON.stringify({
      model: "mock-stub-0",
      answers,
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
