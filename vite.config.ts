import { defineConfig, loadEnv } from "vite";
import { handleApi } from "./server/api.ts";
import { serveRequest } from "./server/http.ts";

export default defineConfig(({ mode }) => {
  // Credentials stay in this server process; never assign them to VITE_ variables.
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    build: { outDir: "dist/client", emptyOutDir: true },
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
    plugins: [
      {
        name: "edge-beacon-api",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith("/api/")) {
              next();
              return;
            }
            void serveRequest(req, res, (request) => handleApi(request, env));
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith("/api/")) {
              next();
              return;
            }
            void serveRequest(req, res, (request) => handleApi(request, env));
          });
        },
      },
    ],
  };
});
