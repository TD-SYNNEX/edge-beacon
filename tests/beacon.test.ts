import test from "node:test";
import assert from "node:assert/strict";
import type { Fetch } from "@typesafe-ai/sdk";
import { handleApi } from "../server/api.ts";
import { decideGate } from "../server/jev/inbox.ts";
import { retrieve, BEACON_INDEX } from "../shared/beacon-index.ts";
import { CATALOG, USE_CASES, EXAMPLES } from "../shared/catalog.ts";
import { INITIAL_INBOX, CUSTOMERS_DATA } from "../shared/edge-data.ts";
import { mockFetch } from "./support/jev-mock.ts";

const ENV = { JEV_ENABLED: "true", TYPESAFE_API_KEY: "test-key" };
const stub = mockFetch as unknown as Fetch;
const post = (
  route: string,
  body: unknown,
  origin = "https://beacon.example",
) =>
  new Request(`https://beacon.example/api/beacon/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
const call = async (
  route: string,
  body: unknown,
  env: object = ENV,
  fetcher: Fetch = stub,
) => {
  const res = await handleApi(post(route, body), env, fetcher as typeof fetch);
  return {
    status: res.status,
    body: (await res.json()) as Record<string, any>,
  };
};

test("config reports Jev readiness only when enabled with a key", async () => {
  const cfg = async (env: object) =>
    (
      await handleApi(new Request("https://beacon.example/api/config"), env)
    ).json();
  assert.equal((await cfg({})).jevReady, false);
  assert.equal((await cfg({ TYPESAFE_API_KEY: "k" })).jevReady, false);
  assert.equal((await cfg(ENV)).jevReady, true);
});

test("beacon routes refuse when Jev is off, cross-site, unknown, or invalid", async () => {
  assert.equal((await call("search", { query: "renewals" }, {})).status, 503);
  const cross = await handleApi(
    post("search", { query: "x y" }, "https://evil.example"),
    ENV,
  );
  assert.equal(cross.status, 403);
  assert.equal((await call("nope", {})).status, 404);
  assert.equal((await call("search", { query: "x" })).status, 400);
  assert.equal(
    (await call("search", { query: "ok query", perspective: "root" })).status,
    400,
  );
  assert.equal(
    (await call("grade", { command: "show ip int br", deviceId: "evil" }))
      .status,
    400,
  );
  assert.equal(
    (await call("opportunities", { customerId: "missing" })).status,
    400,
  );
});

test("upstream failure returns 502 without provider details", async () => {
  const failing = (async () =>
    new Response("secret upstream detail", {
      status: 500,
    })) as unknown as Fetch;
  const res = await call("search", { query: "renewal pipeline" }, ENV, failing);
  assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /secret|test-key/);
});

test("the index covers every course, lab, solution, use case, customer and answer", () => {
  const kinds = new Set(BEACON_INDEX.map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), [
    "answer",
    "course",
    "customer",
    "lab",
    "solution",
    "use_case",
  ]);
  assert.ok(
    BEACON_INDEX.filter((e) => e.kind === "use_case").length ===
      USE_CASES.length,
  );
  assert.equal(retrieve("zzqx nothing matches").widened, true);
  assert.ok(
    retrieve("zzqx").entries.length > 0,
    "widening still offers candidates to rank",
  );
});

test("Ask Beacon returns a known intent and only indexed results", async () => {
  const { status, body } = await call("search", {
    query: "Meraki renewal for Apex Health",
    perspective: "sales",
  });
  assert.equal(status, 200);
  assert.equal(body.mode, "jev");
  assert.ok(
    [
      "open_customer",
      "find_learning",
      "practice_lab",
      "match_solution",
      "program_question",
      "review_approvals",
      "search",
    ].includes(body.intent),
  );
  for (const r of body.results)
    assert.ok(BEACON_INDEX.some((e) => e.kind === r.kind && e.id === r.id));
});

test("Jev matching keeps deployment policy in code and never sends the account alias", async () => {
  let sent = "";
  const spy = (async (url: string, init?: RequestInit) => {
    sent = String(init?.body);
    return mockFetch(url, init);
  }) as unknown as Fetch;
  const { status, body } = await call(
    "match",
    {
      need: EXAMPLES[0].text,
      deployment: "On-premises",
      account: "Secret Account Co",
    },
    ENV,
    spy,
  );
  assert.equal(status, 200);
  assert.equal(body.mode, "jev");
  assert.doesNotMatch(sent, /Secret Account Co/);
  for (const m of body.matches) {
    const s = CATALOG.find((c) => c.id === m.id);
    assert.ok(s?.deployments.includes("On-premises"));
  }
  assert.ok(body.questions.length > 0 && body.nextSteps.length > 0);
});

test("inbox triage ranks every item and never auto-approves upstream writes", async () => {
  const { status, body } = await call("inbox", {
    perspective: "practice_leader",
  });
  assert.equal(status, 200);
  assert.equal(body.items.length, INITIAL_INBOX.length);
  const ranks = body.items.map((i: { rank: number }) => i.rank);
  assert.deepEqual(
    ranks,
    [...ranks].sort((a, b) => b - a),
  );
  for (const item of body.items) {
    const source = INITIAL_INBOX.find((i) => i.id === item.id)!;
    if (
      source.approvalDetails &&
      source.approvalDetails.reversibility !== "Reversible"
    )
      assert.equal(item.gate.route, "human_review");
  }
});

test("gate hard rules outrank confident signals", () => {
  const perfect = {
    blast: 0,
    blastConfidence: 1,
    rationale: 1,
    mandate: 1,
    money: 0,
  };
  const approval = INITIAL_INBOX.find((i) => i.approvalDetails)!;
  const reversible = {
    ...approval,
    approvalDetails: {
      ...approval.approvalDetails!,
      reversibility: "Reversible" as const,
    },
  };
  const upstream = {
    ...approval,
    approvalDetails: {
      ...approval.approvalDetails!,
      reversibility: "Hard gate (writes upstream)" as const,
    },
  };
  assert.equal(decideGate(reversible, perfect).route, "auto_approve");
  assert.equal(decideGate(upstream, perfect).route, "human_review");
  assert.equal(
    decideGate(reversible, { ...perfect, money: 0.9 }).route,
    "human_review",
  );
  assert.equal(
    decideGate(reversible, { ...perfect, rationale: 0.4 }).route,
    "human_review",
  );
  assert.equal(
    decideGate(reversible, { ...perfect, blast: 2.5 }).route,
    "confirm",
  );
});

test("lab grading judges each objective and opportunities are checked per card", async () => {
  const grade = await call("grade", {
    command: "show bgp l2vpn evpn summary",
    deviceId: "cat9300",
  });
  assert.equal(grade.status, 200);
  assert.equal(grade.body.grades.length, 4);
  const customer = CUSTOMERS_DATA.find((c) => c.openOpportunityCards.length)!;
  const opp = await call("opportunities", { customerId: customer.id });
  assert.equal(opp.status, 200);
  assert.equal(opp.body.cards.length, customer.openOpportunityCards.length);
  for (const c of opp.body.cards)
    assert.ok(["grounded", "verify"].includes(c.verdict));
});

test("inherited object keys are not valid lab devices", async () => {
  for (const deviceId of ["constructor", "toString", "__proto__"])
    assert.equal(
      (await call("grade", { command: "show ip int br", deviceId })).status,
      400,
    );
});

test("an incomplete Jev answer fails closed to human review", () => {
  const approval = INITIAL_INBOX.find((i) => i.approvalDetails)!;
  const reversible = {
    ...approval,
    approvalDetails: {
      ...approval.approvalDetails!,
      reversibility: "Reversible" as const,
    },
  };
  const signals = {
    blast: 0,
    blastConfidence: 1,
    rationale: 1,
    mandate: 1,
    money: Number.NaN,
  };
  assert.equal(decideGate(reversible, signals).route, "human_review");
});
