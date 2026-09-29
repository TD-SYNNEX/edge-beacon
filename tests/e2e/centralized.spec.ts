import { test, expect } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("Home — My EDGE renders journey strip, priority inbox and handles J/K triage", async ({
  page,
}) => {
  await page.goto("/#home");

  // Verify Journey Strip
  await expect(page.locator(".edge-journey-strip")).toBeVisible();
  await expect(
    page.locator(".journey-card[data-pillar='engage']"),
  ).toContainText(/Engage/i);
  await expect(
    page.locator(".journey-card[data-pillar='develop']"),
  ).toContainText(/Develop/i);
  await expect(page.locator(".journey-card[data-pillar='grow']")).toContainText(
    /Grow/i,
  );
  await expect(
    page.locator(".journey-card[data-pillar='extend']"),
  ).toContainText(/Extend/i);

  // Verify Priority Inbox Cards
  const inboxCards = page.locator(".inbox-card");
  await expect(inboxCards).toHaveCount(6);
  await page.screenshot({ path: "test-results/home-my-edge.png" });

  // Focus first inbox card
  await inboxCards.first().focus();
  await expect(inboxCards.first()).toBeFocused();

  // Test 'J' key moves to next card
  await page.keyboard.press("j");
  await expect(inboxCards.nth(1)).toBeFocused();

  // Test 'K' key moves back to first card
  await page.keyboard.press("k");
  await expect(inboxCards.first()).toBeFocused();
});

test("slide-over context pane opens approval card with diff preview and closes on Escape", async ({
  page,
}) => {
  await page.goto("/#home");

  // Find the True Forward approval card and click its View / Review button
  const approvalCard = page
    .locator(".inbox-card")
    .filter({ hasText: "Commercial Quote Approval" });
  await expect(approvalCard).toBeVisible();

  const reviewBtn = approvalCard.getByRole("button", { name: /Review|View/i });
  await reviewBtn.click();

  // Context Pane should be open and visible
  const contextPane = page.locator("#context-pane");
  await expect(contextPane).toHaveClass(/open/);
  await expect(page.locator("#context-pane-title")).toContainText(
    "Supervised Agent Approval",
  );

  // Verify diff preview is rendered inside the approval preview
  await expect(page.locator(".diff-preview")).toBeVisible();
  await expect(page.locator(".diff-preview")).toContainText(
    "Unquoted install base: 18 Catalyst 9300s",
  );
  await expect(page.locator(".diff-preview")).toContainText("$32,400 USD net");

  // Verify action buttons exist in pane footer
  await expect(page.locator("#context-pane-footer")).toBeVisible();
  await expect(page.locator("#context-pane-footer")).toContainText(
    "Approve Action",
  );
  await expect(page.locator("#context-pane-footer")).toContainText(
    "Reject with note",
  );

  // Press Escape to close pane
  await page.keyboard.press("Escape");
  await expect(contextPane).not.toHaveClass(/open/);
});

test("Atlas Bar command palette opens with search trigger, searches records and provides cited answers", async ({
  page,
}) => {
  await page.goto("/#home");

  // Click the Atlas Bar trigger in the header
  await page.locator("#atlas-search-trigger").click();
  const dialog = page.locator("#atlas-dialog");
  await expect(dialog).toBeVisible();

  const input = page.locator("#atlas-palette-input");
  await expect(input).toBeFocused();

  // Search for a customer record
  await input.fill("Apex");
  const results = page.locator("#atlas-results-list .atlas-result-item");
  await expect(results.first()).toBeVisible();
  await expect(results.first()).toContainText("Apex Health Systems");

  // Click customer result to open context pane
  await results.first().click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#context-pane")).toHaveClass(/open/);
  await expect(page.locator("#context-pane-title")).toContainText(
    "Apex Health Systems",
  );

  // Close pane
  await page.locator("#context-pane-close").click();
  await expect(page.locator("#context-pane")).not.toHaveClass(/open/);

  // Re-open Atlas Bar and test Ask Atlas mode
  await page.locator("#atlas-search-trigger").click();
  await expect(dialog).toBeVisible();

  // Click Ask Atlas tab
  await page.locator(".atlas-tab-btn[data-tab='ask']").click();
  await page.locator("#atlas-palette-input").fill("PVI");

  // Verify cited answer is shown
  await expect(page.locator(".atlas-qa-answer")).toBeVisible();
  await expect(page.locator(".atlas-qa-answer")).toContainText(
    "Partner Value Index (PVI)",
  );
  await expect(page.locator(".atlas-qa-citations")).toContainText(
    "Cisco 360 Partner Framework §3.4",
  );

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("EDGE spine navigation routes through Engage, Develop, Grow, Extend, Admin", async ({
  page,
}) => {
  await page.goto("/#home");

  // Navigate to Engage
  await page
    .getByRole("link", { name: /Engage/i })
    .first()
    .click();
  await expect(page.locator("#page-engage")).toBeVisible();
  await expect(page.locator("#page-engage")).toContainText(
    "Cisco 360 Program Navigator",
  );
  await expect(
    page.locator("#page-engage .citation-pill").first(),
  ).toBeVisible();

  // Navigate to Develop
  await page
    .getByRole("link", { name: /Develop/i })
    .first()
    .click();
  await expect(page.locator("#page-develop")).toBeVisible();
  await expect(page.locator("#page-develop")).toContainText(
    "Higher EDGEucation Catalog",
  );
  await expect(page.locator("#page-develop")).toContainText("PVI Readiness");
  await expect(page.locator(".course-card")).toHaveCount(6);
  await page.screenshot({ path: "test-results/develop-catalog.png" });

  // Navigate to Grow
  await page.getByRole("link", { name: /Grow/i }).first().click();
  await expect(page.locator("#page-grow")).toBeVisible();
  await expect(page.locator("#page-grow")).toContainText(
    "Customer 360 & Deals",
  );
  await expect(page.locator(".customer-table tr")).toHaveCount(4); // header + 3 customers
  await page.screenshot({ path: "test-results/grow-customer-360.png" });

  // Navigate to Extend
  await page
    .getByRole("link", { name: /Extend/i })
    .first()
    .click();
  await expect(page.locator("#page-extend")).toBeVisible();
  await expect(page.locator("#page-extend")).toContainText(
    "Ecosystem Connectivity",
  );
  await expect(page.locator("#page-extend")).toContainText(
    "Model Context Protocol (MCP) Endpoint",
  );

  // Navigate to Admin
  await page.getByRole("link", { name: /Admin/i }).first().click();
  await expect(page.locator("#page-admin")).toBeVisible();
  await expect(page.locator("#page-admin")).toContainText(
    "Agent Control Tower",
  );
  await expect(page.locator(".dial-input")).toHaveCount(7);
  await expect(page.locator("#system-kill-btn")).toBeVisible();
  await page.screenshot({ path: "test-results/admin-control-tower.png" });
});

test("Develop — NetDojo terminal provides multi-device CLI, study guide, and PVI verification", async ({
  page,
}) => {
  await page.goto("/#develop");

  // Switch to Virtual Labs Estate tab
  const labsTab = page.locator(".subnav-tab[data-subtab='labs']");
  await labsTab.click();

  // Terminal mount and layout should be visible
  const termWrapper = page.locator(".netdojo-terminal-wrapper");
  await expect(termWrapper).toBeVisible();
  await expect(page.locator(".netdojo-term-screen")).toBeVisible();
  await expect(page.locator(".netdojo-study-drawer")).toBeVisible();

  // Verify initial prompt for Cat9300-Edge-01
  const promptEl = page.locator(".term-prompt-label");
  await expect(promptEl).toContainText("Cat9300-Edge-01#");

  // Typing `verify` first earns nothing: the score reflects real work only.
  const termInput = page.locator(".netdojo-term-input");
  await termInput.fill("verify");
  await termInput.press("Enter");
  await expect(page.locator(".netdojo-term-screen")).toContainText(
    "Final Lab Score: 0%",
  );

  // Type CLI command `show ip int brief` and press Enter
  await termInput.fill("show ip int brief");
  await termInput.press("Enter");

  // Screen output should contain Cisco interface details
  const screenEl = page.locator(".netdojo-term-screen");
  await expect(screenEl).toContainText("GigabitEthernet0/0/0");
  await expect(screenEl).toContainText("192.168.1.10");

  await termInput.fill("show bgp evpn summary");
  await termInput.press("Enter");
  await expect(screenEl).toContainText("BGP EVPN peers configured");

  await page.locator(".netdojo-device-tab[data-device-id='cat8000v']").click();
  await termInput.fill("show sdwan control connections");
  await termInput.press("Enter");
  await expect(screenEl).toContainText("vsmart");

  // Switch device to Automation-Host
  const hostTab = page.locator(
    ".netdojo-device-tab[data-device-id='auto-host']",
  );
  await hostTab.click();
  await expect(promptEl).toContainText("cml-user@netdojo:~$");

  // Test study guide clickable snippet
  const snippetBtn = page
    .locator(".term-snippet-btn")
    .filter({ hasText: "cisco_health_check.py" });
  await snippetBtn.click();

  // PyATS output should appear in terminal screen
  await expect(screenEl).toContainText("Task Execution Summary");
  await expect(screenEl).toContainText("HEALTH CHECK PASSED");

  // Run `verify` command to validate lab and earn PVI points
  await termInput.fill("verify");
  await termInput.press("Enter");
  await expect(screenEl).toContainText("NETDOJO LAB VERIFICATION");
  await expect(screenEl).toContainText("Final Lab Score: 100%");

  // Toast should confirm PVI progress award
  const toastEl = page.locator("#toast");
  await expect(toastEl).toBeVisible();
  await expect(toastEl).toContainText("NetDojo Lab Verified!");
  await expect(toastEl).toContainText("PVI +0.3 Networking Capability");

  // Take screenshot of interactive NetDojo terminal
  await page.screenshot({ path: "test-results/netdojo-terminal.png" });

  // Test Atlas Bar launch to terminal
  await page.keyboard.press("Meta+k");
  const atlasDialog = page.locator("#atlas-dialog");
  await expect(atlasDialog).toBeVisible();
  const termAction = page
    .locator(".atlas-result-item")
    .filter({ hasText: "Launch NetDojo Terminal Console" });
  await expect(termAction).toBeVisible();
  await termAction.click();
  await expect(atlasDialog).not.toBeVisible();
  await expect(termWrapper).toBeVisible();
});
