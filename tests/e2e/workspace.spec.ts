import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { EXAMPLES } from "../../shared/catalog.ts";
import { matchSolutions } from "../../shared/matcher.ts";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("discovery → saved comparison → edited download survives reload", async ({
  page,
}) => {
  await page.goto("/#discover");
  await expect(page.locator("#mode-badge")).toHaveText("Guided matching");
  await expect(page.locator("#match-button")).toBeEnabled();
  await expect(page.locator("#match-button")).toHaveCSS(
    "background-color",
    "rgb(0, 87, 88)",
  );
  await page.screenshot({
    path: "test-results/desktop-discovery.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Too many sites/ }).click();
  await page.getByRole("button", { name: "Find my solutions" }).click();
  await expect(
    page.locator("#discovery-results .solution-card").first(),
  ).toContainText("Meraki AI Ops Dashboard");
  await page
    .locator("#discovery-results")
    .getByRole("button", { name: "Save Meraki AI Ops Dashboard to shortlist" })
    .click();
  await page.getByRole("link", { name: /My shortlist/ }).click();
  await expect(page.getByRole("table")).toContainText(
    "Meraki AI Ops Dashboard",
  );
  await page.reload();
  await expect(page.getByRole("table")).toContainText(
    "Meraki AI Ops Dashboard",
  );
  await page
    .getByRole("button", { name: "Build discovery brief", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Brief content")).toHaveValue(
    /Meraki AI Ops Dashboard/,
  );
  await page
    .getByLabel("Brief content")
    .fill("Reviewed pilot plan. Owner: network operations.");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await downloading;
  expect(await readFile((await download.path())!, "utf8")).toBe(
    "Reviewed pilot plan. Owner: network operations.",
  );
  await page.getByRole("button", { name: "Close discovery brief" }).click();
  await expect(
    page.getByRole("button", { name: "Build discovery brief", exact: true }),
  ).toBeFocused();
});

test("library filters, empty state, detail costs and shortlist capacity", async ({
  page,
}) => {
  await page.goto("/#library");
  await expect(page.locator("#library-cards .solution-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Networking", exact: true }).click();
  await expect(page.locator("#library-count")).toHaveText("2 solutions");
  await page
    .getByRole("searchbox", { name: "Search solutions" })
    .fill("unmatched customer example");
  await expect(page.locator("#library-empty")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator("#library-cards .solution-card")).toHaveCount(12);
  await page
    .locator("#library-cards")
    .getByRole("button", { name: "Explore solution" })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "On-premises", exact: true })
    .click();
  await expect(page.locator("#detail-cost-content")).toContainText(
    "Setup estimate",
  );
  await page.keyboard.press("Escape");
  await expect(
    page
      .locator("#library-cards")
      .getByRole("button", { name: "Explore solution" })
      .first(),
  ).toBeFocused();
  for (const name of [
    "Meraki AI Ops Dashboard",
    "NSO AI Dashboard",
    "Cisco Platform MCP Tools",
    "Partner Knowledge Bot",
  ]) {
    await page
      .locator("#library-cards")
      .getByRole("button", { name: `Save ${name} to shortlist` })
      .click();
  }
  await expect(page.locator("#shortlist-count")).toHaveText("3");
  await expect(page.getByRole("status")).toContainText("three solutions");
});

test("use-case paging, combined filters and a use-case brief", async ({
  page,
}) => {
  await page.goto("/#use-cases");
  await expect(page.locator("#use-case-grid .use-case-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#use-case-pagination")).toContainText(
    "13–24 of 375",
  );
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.locator("#use-case-pagination")).toContainText(
    "1–12 of 375",
  );
  await page
    .getByRole("combobox", { name: "Product line", exact: true })
    .selectOption("Healthcare & Dental AI Access");
  await page
    .getByRole("combobox", { name: "Vertical", exact: true })
    .selectOption("Dental");
  await expect(page.locator("#use-case-count")).toHaveText("4 use cases");
  await page
    .getByRole("searchbox", { name: "Search use cases" })
    .fill("hygiene");
  await expect(page.locator("#use-case-grid .use-case-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Open use case" }).click();
  await page.getByRole("button", { name: "Use in a discovery brief" }).click();
  await expect(page.getByLabel("Brief content")).toHaveValue(
    /Dental hygiene block fill agent/,
  );
  await page.getByRole("button", { name: "Close discovery brief" }).click();
  await page
    .getByRole("searchbox", { name: "Search use cases" })
    .fill("zzzzzzz");
  await expect(page.locator("#use-case-empty")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator("#use-case-pagination")).toContainText(
    "1–12 of 375",
  );
});

test("sales perspective, learning plans and practice path remain connected", async ({
  page,
}) => {
  await page.goto("/#discover");
  await page
    .getByRole("button", { name: "Internal sales", exact: true })
    .click();
  await page.getByLabel("Account or opportunity").fill("Sample account");
  await page.reload();
  await expect(page.getByLabel("Account or opportunity")).toHaveValue(
    "Sample account",
  );
  await page.getByRole("link", { name: "Enablement", exact: true }).click();
  await page.getByRole("button", { name: "Builder", exact: true }).click();
  await expect(page.locator("#learning-heading")).toContainText("scoped pilot");
  await page
    .getByRole("button", { name: "Plan this learning" })
    .first()
    .click();
  await expect(page.getByLabel("Brief content")).toHaveValue(
    /Network Automation \(builder\)/,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "The accelerator", exact: true })
    .click();
  await page
    .locator(".tier-card")
    .filter({ has: page.getByRole("heading", { name: "Build", exact: true }) })
    .getByRole("button")
    .click();
  await expect(page.getByLabel("Practice stage")).toHaveValue(
    "Building a practice",
  );
});

test("AI API errors offer working guided matching and new inputs clear stale results", async ({
  page,
}) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { aiReady: true } }),
  );
  await page.route("**/api/discover", (route) =>
    route.fulfill({
      status: 502,
      json: { message: "AI is busy. Try guided matching." },
    }),
  );
  await page.goto("/#discover");
  await page
    .getByLabel("Tell us what needs to work better.")
    .fill(EXAMPLES[0].text);
  await page.getByRole("button", { name: "Find with AI" }).click();
  await expect(page.getByRole("alert")).toContainText("AI is busy");
  await page
    .getByRole("button", { name: "Use guided matching for this need" })
    .click();
  await expect(page.locator("#discovery-results")).toContainText(
    "GUIDED CATALOG MATCHING",
  );
  await page
    .getByLabel("Tell us what needs to work better.")
    .fill("A new customer needs scheduling help.");
  await expect(page.locator("#discovery-results")).toBeEmpty();
});

test("AI responses render escaped text and refinement includes discovery notes", async ({
  page,
}) => {
  const input = {
    need: EXAMPLES[0].text,
    role: "partner" as const,
    industry: "Retail",
    priority: "Save time",
    deployment: "No preference",
    readiness: "Just exploring",
    account: "",
    timing: "To confirm",
  };
  const result = {
    ...matchSolutions(input),
    mode: "ai",
    summary: "<img src=x onerror=alert(1)> Suggested pilot.",
  };
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { aiReady: true } }),
  );
  await page.route("**/api/discover", (route) =>
    route.fulfill({ json: result }),
  );
  await page.goto("/#discover");
  await page.getByRole("button", { name: /Too many sites/ }).click();
  await page.getByRole("button", { name: "Find with AI" }).click();
  await expect(page.locator("#discovery-results")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("#discovery-results img")).toHaveCount(0);
  await page
    .getByLabel("Add what you learn")
    .fill("Pilot owner is the branch operations team.");
  const request = page.waitForRequest("**/api/discover");
  await page.getByRole("button", { name: "Refine recommendations" }).click();
  expect((await request).postDataJSON().need).toContain(
    "Pilot owner is the branch operations team.",
  );
});

test("mobile navigation, discovery and all routes fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#discover");
  await expect(page.locator("#mode-badge")).toHaveText("Guided matching");
  await expect(page.locator("#sidebar")).toHaveAttribute("inert", "");
  await page.screenshot({
    path: "test-results/mobile-discovery.png",
    fullPage: true,
  });
  for (const route of [
    "Turnkey solutions",
    "Use-case atlas",
    "My shortlist",
    "Enablement",
    "The accelerator",
    "Find a solution",
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.locator("#main")).toHaveAttribute("inert", "");
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: new RegExp(route) })
      .click();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: /Every missed call/ }).click();
  await page.getByRole("button", { name: "Find my solutions" }).click();
  await expect(
    page.locator("#discovery-results .solution-card").first(),
  ).toContainText("LiveKit Voice / Video Agent");
  await page.screenshot({
    path: "test-results/mobile-results.png",
    fullPage: true,
  });
});

test("tablet atlas has no horizontal overflow and API config is reachable", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/#use-cases");
  await expect(page.locator("#use-case-grid .use-case-card")).toHaveCount(12);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/tablet-atlas.png",
    fullPage: true,
  });
  const response = await request.get("/api/config");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ aiReady: false, jevReady: false });
});
