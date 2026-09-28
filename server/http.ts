import type { IncomingMessage, ServerResponse } from "node:http";

/** Shared body limits and headers for Vite and the production Node adapter. */
export async function serveRequest(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (request: Request) => Promise<Response>,
): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 24000) {
        res.writeHead(413);
        res.end("Request too large");
        return;
      }
      chunks.push(bytes);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value))
        value.forEach((item) => headers.append(key, item));
      else if (value !== undefined) headers.set(key, value);
    }
    const method = req.method ?? "GET";
    const request = new Request(
      `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`,
      {
        method,
        headers,
        ...(["GET", "HEAD"].includes(method)
          ? {}
          : { body: Buffer.concat(chunks) }),
      },
    );
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Request failed");
  }
}
