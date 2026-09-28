import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import type { Asset } from "../server/worker.ts";

const root = path.resolve(import.meta.dirname, "..");
const clientDir = path.join(root, "dist/client");
const assets: Record<string, Asset> = {};
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
async function walk(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    const url = "/" + path.relative(clientDir, file).split(path.sep).join("/");
    const bytes = await readFile(file);
    assets[url] = {
      data: bytes.toString("base64"),
      type: contentTypes[path.extname(file)] ?? "application/octet-stream",
    };
  }
}
await walk(clientDir);
assets["/"] = assets["/index.html"];
await mkdir(path.join(root, "dist/server"), { recursive: true });
await mkdir(path.join(root, "dist/.openai"), { recursive: true });
await build({
  stdin: {
    contents: `import { createWorker } from './server/worker.ts'; export default createWorker(${JSON.stringify(assets)});`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: path.join(root, "dist/server/index.js"),
});
await copyFile(
  path.join(root, ".openai/hosting.json"),
  path.join(root, "dist/.openai/hosting.json"),
);
console.log(`Built Worker with ${Object.keys(assets).length} Vite assets.`);
