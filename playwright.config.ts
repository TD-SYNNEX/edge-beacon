import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 3,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.E2E_BASE_URL ? "npm start" : "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    // Accepts tests/e2e/fixtures.ts's unsigned test tokens instead of real
    // Cognito JWTs. Never set in the deployed Lambda's CDK config.
    env: {
      AUTH_TEST_MODE: "true",
      // Placeholders so signed-out specs can reach the sign-in redirect in CI,
      // where .env (and the real pool) is absent. Nothing contacts Cognito.
      VITE_COGNITO_DOMAIN: "e2e",
      VITE_COGNITO_CLIENT_ID: "e2e",
      VITE_COGNITO_REGION: "us-east-1",
    },
  },
});
