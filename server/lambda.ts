import { loadSecrets } from "./secrets.ts";
import type { Worker } from "./worker.ts";
import type { ServerEnv } from "../shared/types.ts";

/** Minimal shape of a Lambda Function URL event (API Gateway v2.0 payload format). */
interface FunctionUrlEvent {
  rawPath: string;
  rawQueryString: string;
  headers?: Record<string, string | undefined>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  requestContext: { http: { method: string } };
}

interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  cookies?: string[];
  body: string;
  isBase64Encoded: boolean;
}

function toRequest(event: FunctionUrlEvent): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {}))
    if (value !== undefined) headers.set(key, value);
  const method = event.requestContext.http.method;
  const url = `https://lambda.local${event.rawPath}${event.rawQueryString ? "?" + event.rawQueryString : ""}`;
  const body = event.body
    ? event.isBase64Encoded
      ? Uint8Array.from(atob(event.body), (c) => c.charCodeAt(0))
      : event.body
    : undefined;
  return new Request(url, {
    method,
    headers,
    ...(["GET", "HEAD"].includes(method) ? {} : { body }),
  });
}

async function toResult(response: Response): Promise<FunctionUrlResult> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") headers[key] = value;
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    statusCode: response.status,
    headers,
    ...(cookies.length ? { cookies } : {}),
    body: btoa(binary),
    isBase64Encoded: true,
  };
}

/** Wraps a fetch-style Worker as a Lambda Function URL handler. */
export function createHandler(worker: Worker) {
  return async (event: FunctionUrlEvent): Promise<FunctionUrlResult> => {
    // Always read process.env directly here, never as a default parameter:
    // the Lambda Node.js runtime invokes every handler with a third
    // argument (a completion callback, for handlers that use the legacy
    // callback style) even though async handlers ignore it — so a
    // `processEnv = process.env` default parameter never fires, and
    // processEnv silently becomes that callback instead. Confirmed live:
    // this made every request run with an empty env, so every /api/*
    // call 401'd unconditionally regardless of a valid signed-in token.
    const processEnv = process.env as ServerEnv;
    await loadSecrets(processEnv);
    const response = await worker.fetch(toRequest(event), processEnv);
    return toResult(response);
  };
}
