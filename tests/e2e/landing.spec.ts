import { test as signedIn, expect } from "./fixtures.ts";
import { test as signedOut } from "@playwright/test";

signedOut(
  "signed out: home is public; a menu link signs in and keeps the route",
  async ({ page }) => {
    let pending = "";
    await page.exposeFunction("__capture", (v: string) => (pending = v));
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === "eb-auth-pending-v1")
          (window as unknown as { __capture(v: string): void }).__capture(v);
        return set.call(this, k, v);
      };
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hello, partner" }),
    ).toBeVisible();
    await expect(page.locator("#menu-toggle")).toBeHidden();
    await page.getByRole("button", { name: "Menu" }).click();
    const nav = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .last();
    await expect(
      nav.getByRole("heading", { name: "Control plane" }),
    ).toBeVisible();
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().includes("/oauth2/authorize")),
      nav.getByRole("link", { name: /Grow/ }).click(),
    ]);
    expect(request.url()).toContain("code_challenge_method=S256");
    expect(JSON.parse(pending).target).toBe("#grow");
  },
);

signedOut("signed out: a deep link signs in immediately", async ({ page }) => {
  const request = page.waitForRequest((r) =>
    r.url().includes("/oauth2/authorize"),
  );
  await page.goto("/#develop");
  expect((await request).url()).toContain("response_type=code");
});

signedIn(
  "signed in: / is the home page; menu opens the workspace and the logo returns",
  async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hello, partner" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Menu" }).click();
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .last()
      .getByRole("link", { name: /Engage/ })
      .click();
    await expect(page).toHaveURL(/#engage$/);
    await expect(page.locator("#menu-toggle, .header").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hello, partner" }),
    ).toBeHidden();
    await page.locator(".brand").click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hello, partner" }),
    ).toBeVisible();
  },
);
