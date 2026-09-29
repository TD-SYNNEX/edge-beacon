import { test, expect } from "./fixtures.ts";
import type { Page } from "@playwright/test";

/** Browser wiring with Jev on. Server-side Jev logic is covered in tests/beacon.test.ts. */
const meta = { model: "jev-test", elapsedMs: 90, asked: 1 };
const FIXTURES: Record<string, unknown> = {
  search: {
    mode: "jev",
    intent: "find_learning",
    intentConfidence: 0.82,
    widened: true,
    meta,
    results: [
      {
        kind: "course",
        id: "course-1",
        title: "Jev-ranked course",
        subtitle: "Networking · Self-paced",
        relevance: 2.8,
      },
    ],
  },
  inbox: {
    mode: "jev",
    meta,
    items: [
      {
        id: "inbox-3",
        rank: 0.9,
        urgency: 2.6,
        needsMe: 0.9,
        why: "Should be handled today. 90% likely needs you.",
      },
      {
        id: "inbox-1",
        rank: 0.7,
        urgency: 2,
        needsMe: 0.8,
        why: "Should be handled this week.",
        gate: { route: "human_review", why: "Hard gate: always a person." },
      },
    ],
  },
  grade: {
    mode: "jev",
    meta,
    grades: [
      {
        objectiveId: "step-2",
        title: "Verify BGP EVPN neighbor peering",
        probability: 0.94,
        verdict: "credited",
      },
      {
        objectiveId: "step-1",
        title: "Verify interface IP state",
        probability: 0.1,
        verdict: "no",
      },
    ],
  },
  match: {
    mode: "jev",
    meta,
    summary:
      "These catalog options match the needs and priorities you provided.",
    matches: [
      {
        id: "nso",
        reason:
          "91% likely to address the need. Directly addresses the specific problem described in the need.",
      },
    ],
    useCaseMatches: [],
    questions: ["Which task should change first?"],
    nextSteps: [
      "Confirm the problem.",
      "Review prerequisites.",
      "Scope one pilot.",
    ],
    tier: "Explore",
    assumptions: [],
  },
  opportunities: {
    mode: "jev",
    meta,
    cards: [
      {
        id: "opp-1",
        suggestedCategory: "EoL Refresh",
        categoryConfidence: 0.9,
        categoryMatches: true,
        evidence: 2.7,
        supported: 0.93,
        verdict: "grounded",
      },
      {
        id: "opp-2",
        suggestedCategory: "EA Expansion",
        categoryConfidence: 0.6,
        categoryMatches: false,
        evidence: 0.8,
        supported: 0.31,
        verdict: "verify",
      },
    ],
  },
};

async function withJev(page: Page) {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { aiReady: false, jevReady: true } }),
  );
  await page.route("**/api/beacon/*", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    return route.fulfill({
      json: FIXTURES[name] ?? {},
      status: FIXTURES[name] ? 200 : 404,
    });
  });
}

test("Ask Beacon puts Jev's intent shortcut and ranked results first", async ({
  page,
}) => {
  await withJev(page);
  await page.goto("/#home");
  await page.keyboard.press("Meta+k");
  await page
    .locator("#atlas-palette-input")
    .fill("get my team certified faster");
  const group = page.locator(".atlas-group-title").first();
  await expect(group).toHaveText("Beacon · ranked by Jev");
  await expect(page.locator(".atlas-result-item").first()).toContainText(
    "Browse courses & add-ons",
  );
  await expect(page.locator(".atlas-result-item").nth(1)).toContainText(
    "Jev-ranked course",
  );
  await page.locator(".atlas-result-item").nth(1).click();
  await expect(page.locator("#atlas-dialog")).not.toBeVisible();
});

test("the query is escaped in the palette", async ({ page }) => {
  await withJev(page);
  await page.goto("/#home");
  await page.keyboard.press("Meta+k");
  await page
    .locator("#atlas-palette-input")
    .fill("<img src=x onerror=alert(1)>zz");
  await expect(page.locator("#atlas-results-list img")).toHaveCount(0);
});

test("the inbox is re-ranked for the role and approvals show the gate", async ({
  page,
}) => {
  await withJev(page);
  await page.goto("/#home");
  await expect(page.locator(".inbox-card").first()).toHaveAttribute(
    "data-id",
    "inbox-3",
  );
  await expect(
    page.locator(".inbox-card[data-id='inbox-1'] .jev-gate"),
  ).toHaveText("Jev: needs human review");
  await expect(page.locator(".inbox-card")).toHaveCount(6);
});

test("Customer 360 flags opportunity cards the account data does not support", async ({
  page,
}) => {
  await withJev(page);
  await page.goto("/#grow");
  await page.locator(".customer-row[data-id='cust-apex']").click();
  await expect(page.locator("[data-jev-opp='opp-1']")).toContainText(
    "Jev: evidence checks out",
  );
  await expect(page.locator("[data-jev-opp='opp-2']")).toContainText(
    "Jev: verify before working",
  );
  await expect(page.locator("[data-jev-opp='opp-2']")).toContainText(
    "looks more like EA Expansion",
  );
});

test("the lab terminal credits objectives by what a command does", async ({
  page,
}) => {
  await withJev(page);
  await page.goto("/#develop");
  await page.locator(".subnav-tab[data-subtab='labs']").click();
  const input = page.locator(".netdojo-term-input");
  await input.fill("show bgp l2vpn evpn summary");
  await input.press("Enter");
  await expect(page.locator(".netdojo-term-screen")).toContainText(
    "Jev credited: Verify BGP EVPN neighbor peering",
  );
  await input.fill("verify");
  await input.press("Enter");
  await expect(page.locator(".netdojo-term-screen")).toContainText(
    "graded by Jev",
  );
  await expect(page.locator(".netdojo-term-screen")).toContainText(
    "Final Lab Score: 25%",
  );
});

test("discovery uses Jev's ranking and labels it", async ({ page }) => {
  await withJev(page);
  await page.goto("/#discover");
  await expect(page.locator("#mode-badge")).toHaveText("Jev-powered");
  await page.getByRole("button", { name: /Too many sites/ }).click();
  await page.getByRole("button", { name: "Find my solutions" }).click();
  await expect(page.locator("#discovery-results")).toContainText(
    "JEV-RANKED DISCOVERY",
  );
  await expect(
    page.locator("#discovery-results .solution-card").first(),
  ).toContainText("91% likely to address the need");
});
