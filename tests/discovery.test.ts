import type { DiscoveryInput } from "../shared/types.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG,
  EXAMPLES,
  USE_CASES,
  PRODUCT_LINES,
  VERTICALS,
} from "../shared/catalog.ts";
import { matchSolutions, createBrief } from "../shared/matcher.ts";
import { handleApi, validateInput, validateResult } from "../server/api.ts";

const input = (overrides: Partial<DiscoveryInput> = {}): DiscoveryInput => ({
  need: EXAMPLES[0].text,
  role: "partner",
  industry: "Retail",
  priority: "Save time",
  deployment: "No preference",
  readiness: "Just exploring",
  account: "",
  timing: "To confirm",
  ...overrides,
});
const req = (body: unknown) =>
  new Request("https://workspace.example/api/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://workspace.example",
    },
    body: JSON.stringify(body),
  });

test("the supplied catalog has twelve unique solutions and complete discovery content", () => {
  assert.equal(CATALOG.length, 12);
  assert.equal(new Set(CATALOG.map((s) => s.id)).size, 12);
  for (const s of CATALOG) {
    assert.ok(s.name && s.outcome && s.sales);
    assert.equal(s.questions.length, 3);
    assert.ok(s.requirements.length);
  }
});
test("the solution atlas covers product lines and verticals", () => {
  assert.equal(USE_CASES.length, 375);
  assert.equal(PRODUCT_LINES.length, 15);
  assert.equal(VERTICALS.length, 16);
  assert.equal(new Set(USE_CASES.map((item) => item.id)).size, 375);
  assert.ok(
    USE_CASES.filter((item) => item.productLine.startsWith("LiveKit")).length >=
      250,
  );
  assert.ok(
    USE_CASES.some(
      (item) =>
        item.vertical === "Healthcare" && /scheduling/i.test(item.deliverable),
    ),
  );
  assert.ok(
    USE_CASES.some(
      (item) =>
        item.vertical === "Dental" && /hygiene|recall/i.test(item.deliverable),
    ),
  );
  for (const item of USE_CASES) {
    assert.ok(item.deliverable && item.automation && item.systems);
    assert.equal(item.discovery.length, 3);
  }
});
test("retail network discovery prioritizes Meraki and explains the match", () => {
  const result = matchSolutions(input());
  assert.equal(result.matches[0].id, "meraki");
  assert.match(result.matches[0].reason, /meraki|sites|retail/i);
  assert.equal(result.mode, "guided");
  assert.equal(result.tier, "Explore");
});
test("voice discovery and hands-on training produce distinct recommendations", () => {
  const voice = matchSolutions(
    input({
      need: EXAMPLES[1].text,
      priority: EXAMPLES[1].priority,
      industry: "Healthcare",
    }),
  );
  assert.equal(voice.matches[0].id, "voice");
  const learning = matchSolutions(
    input({
      need: EXAMPLES[2].text,
      priority: "Build team skills",
      readiness: "Building a practice",
    }),
  );
  assert.equal(learning.matches[0].id, "netdojo");
  assert.ok(learning.matches.some((s) => s.id === "salesdojo"));
  assert.equal(learning.tier, "Build");
});
test("irrelevant requests do not produce fabricated matches from industry alone", () => {
  const result = matchSolutions(
    input({
      need: "I need to organize a birthday dinner for friends.",
      priority: "Find the right starting point",
      industry: "Healthcare",
    }),
  );
  assert.deepEqual(result.matches, []);
  assert.ok(result.questions.length);
});
test("deployment constraints exclude incompatible private infrastructure", () => {
  const result = matchSolutions(
    input({
      need: "We want private local inference on vllm and ollama.",
      priority: "Reduce risk",
      deployment: "Cloud",
    }),
  );
  assert.ok(!result.matches.some((s) => s.id === "privateai"));
  const onprem = matchSolutions(
    input({
      need: "We want private local inference on vllm and ollama.",
      priority: "Reduce risk",
      deployment: "On-premises",
    }),
  );
  assert.equal(onprem.matches[0].id, "privateai");
});
test("brief carries customer details, user notes, selected solutions, and a clear draft status", () => {
  const context = input({ role: "sales", account: "Sample account" });
  const result = matchSolutions(context);
  const brief = createBrief(
    context,
    result,
    ["meraki"],
    "Pilot owner is still to confirm.",
  );
  assert.match(brief, /Sample account/);
  assert.match(brief, /Draft for review/);
  assert.match(brief, /Meraki AI Ops Dashboard/);
  assert.match(brief, /Conversation starter/);
  assert.match(brief, /Pilot owner is still to confirm/);
  assert.match(
    brief,
    /No request, booking, CRM update, or deployment has been submitted/,
  );
});
test("invalid requests reject missing needs, oversized fields, and unsupported options", () => {
  assert.throws(() => validateInput(input({ need: "x" })));
  assert.throws(() => validateInput(input({ need: "x".repeat(5001) })));
  assert.throws(() =>
    validateInput(input({ deployment: "Invented platform" })),
  );
  assert.throws(() => validateInput(input({ account: "x".repeat(151) })));
});
test("the unconfigured preview stays honestly unavailable for AI and reveals no secrets", async () => {
  let called = false;
  const config = await handleApi(
    new Request("https://workspace.example/api/config"),
    { OPENAI_API_KEY: "unit-test-secret", AI_ENABLED: "false" },
  );
  assert.deepEqual(await config.json(), { aiReady: false, jevReady: false });
  const result = await handleApi(req(input()), {}, async () => {
    called = true;
    return new Response();
  });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, "AI_NOT_CONNECTED");
  assert.equal(called, false);
});
test("cross-origin submissions and oversized raw bodies are rejected", async () => {
  const foreign = new Request("https://workspace.example/api/discover", {
    method: "POST",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input()),
  });
  assert.equal((await handleApi(foreign, {})).status, 403);
  const large = new Request("https://workspace.example/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ need: "a".repeat(25000) }),
  });
  assert.equal((await handleApi(large, {})).status, 400);
});
test("server contract uses Responses structured output, omits account identifiers, and validates catalog IDs", async () => {
  const context = input({ account: "PRIVATE_ACCOUNT_42" });
  const { mode: unusedMode, ...result } = matchSolutions(context);
  let requestBody:
    | {
        store: boolean;
        text: { format: { type: string; strict: boolean } };
        tools?: unknown;
      }
    | undefined;
  const mock: typeof fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    requestBody = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(result) }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const response = await handleApi(
    req(context),
    { OPENAI_API_KEY: "unit-test-not-a-real-key", AI_ENABLED: "true" },
    mock,
  );
  assert.equal(response.status, 200);
  assert.ok(requestBody);
  const answer = await response.json();
  assert.equal(answer.mode, "ai");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.strict, true);
  assert.ok(!JSON.stringify(requestBody).includes("PRIVATE_ACCOUNT_42"));
  assert.equal(requestBody.tools, undefined);
});
test("invented, duplicate, and incompatible AI solution IDs cannot reach the UI", () => {
  const context = input();
  const result = matchSolutions(context);
  assert.throws(() =>
    validateResult(
      { ...result, matches: [{ id: "invented", reason: "Made up" }] },
      context,
    ),
  );
  assert.throws(() =>
    validateResult(
      {
        ...result,
        matches: [
          { id: "meraki", reason: "A" },
          { id: "meraki", reason: "B" },
        ],
      },
      context,
    ),
  );
  assert.throws(() =>
    validateResult(
      { ...result, matches: [{ id: "privateai", reason: "Not cloud" }] },
      input({ deployment: "Cloud" }),
    ),
  );
});
test("provider errors, refusals, malformed outputs, and timeouts fail without a false success", async () => {
  const env = {
    OPENAI_API_KEY: "unit-test-not-a-real-key",
    AI_ENABLED: "true",
  };
  const quota = await handleApi(
    req(input()),
    env,
    async () => new Response("private provider detail", { status: 429 }),
  );
  assert.equal(quota.status, 502);
  assert.ok(!(await quota.text()).includes("private provider detail"));
  const refusal = await handleApi(req(input()), env, async () =>
    Response.json({
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "Refused" }] },
      ],
    }),
  );
  assert.equal(refusal.status, 422);
  const malformed = await handleApi(req(input()), env, async () =>
    Response.json({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "not json" }],
        },
      ],
    }),
  );
  assert.equal(malformed.status, 502);
  const timeout = await handleApi(req(input()), env, async () => {
    const e = new Error("timeout");
    e.name = "AbortError";
    throw e;
  });
  assert.equal(timeout.status, 502);
});
