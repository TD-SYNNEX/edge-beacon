import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { serveRequest } from "../server/http.ts";
import type { Worker } from "../server/worker.ts";

const workerPath = pathToFileURL(
  path.resolve(import.meta.dirname, "../dist/server/index.js"),
).href;
const { default: worker } = (await import(workerPath)) as { default: Worker };
const port = Number(process.env.PORT ?? 3000);
http
  .createServer((req, res) => {
    void serveRequest(req, res, (request) =>
      worker.fetch(request, process.env),
    );
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`AI Atlas listening at http://localhost:${port}`),
  );
