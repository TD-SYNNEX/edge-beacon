import { handleApi } from "./api.ts";
import type { ServerEnv } from "../shared/types.ts";

export interface Asset {
  data: string;
  type: string;
}
export interface Worker {
  fetch(request: Request, env?: ServerEnv): Promise<Response>;
}

export function createWorker(assets: Record<string, Asset>): Worker {
  return {
    async fetch(request, env = {}) {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith("/api/")) return handleApi(request, env);
      if (!["GET", "HEAD"].includes(request.method))
        return new Response("Method not allowed", { status: 405 });
      const asset = Object.hasOwn(assets, pathname)
        ? assets[pathname]
        : undefined;
      if (!asset) return new Response("Not found", { status: 404 });
      const data = Uint8Array.from(atob(asset.data), (char) =>
        char.charCodeAt(0),
      );
      return new Response(request.method === "HEAD" ? null : data, {
        headers: {
          "Content-Type": asset.type,
          "Cache-Control": /\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(pathname)
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "same-origin",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
        },
      });
    },
  };
}
