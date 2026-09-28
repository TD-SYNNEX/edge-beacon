import test from "node:test";
import assert from "node:assert/strict";
import { createWorker } from "../server/worker.ts";

const worker = createWorker({
  "/": {
    data: btoa("<main>AI Atlas</main>"),
    type: "text/html; charset=utf-8",
  },
  "/assets/index-abcdefgh.js": {
    data: btoa("export {};"),
    type: "text/javascript; charset=utf-8",
  },
});

test("Worker serves Vite assets with matching MIME, HEAD, cache and security headers", async () => {
  const page = await worker.fetch(new Request("https://atlas.example/"));
  assert.equal(await page.text(), "<main>AI Atlas</main>");
  assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(page.headers.get("cache-control"), "no-cache");
  assert.match(
    page.headers.get("content-security-policy") ?? "",
    /script-src 'self'/,
  );
  const asset = await worker.fetch(
    new Request("https://atlas.example/assets/index-abcdefgh.js", {
      method: "HEAD",
    }),
  );
  assert.equal(await asset.text(), "");
  assert.match(asset.headers.get("cache-control") ?? "", /immutable/);
  assert.equal(
    asset.headers.get("content-type"),
    "text/javascript; charset=utf-8",
  );
  assert.equal(
    (await worker.fetch(new Request("https://atlas.example/missing.js")))
      .status,
    404,
  );
  assert.equal(
    (await worker.fetch(new Request("https://atlas.example/toString"))).status,
    404,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://atlas.example/", { method: "POST" }),
      )
    ).status,
    405,
  );
});

test("Worker routes API requests to the server handler without exposing environment values", async () => {
  const response = await worker.fetch(
    new Request("https://atlas.example/api/config"),
    { AI_ENABLED: "false", OPENAI_API_KEY: "test-only" },
  );
  assert.deepEqual(await response.json(), { aiReady: false, jevReady: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
