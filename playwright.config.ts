import { defineConfig, devices } from "@playwright/test";
import { readApprovedIsolatedTargetManifest, validateIsolatedTarget } from "./tests/isolated-e2e-guard";

const isolationRequested = process.env.ARIMA_E2E_RUN === "1" || process.env.ARIMA_E2E_ENV === "isolated";
const isolatedRun = isolationRequested && process.env.ARIMA_E2E_RUN === "1" && process.env.ARIMA_E2E_ENV === "isolated";
const configuredBaseURL = process.env.ARIMA_E2E_BASE_URL;
if (isolationRequested && !isolatedRun) {
  throw new Error("Refusing E2E: isolated execution requires ARIMA_E2E_RUN=1 and ARIMA_E2E_ENV=isolated.");
}
if (isolatedRun && (!configuredBaseURL || process.env.ARIMA_E2E_CONFIRMATION !== "ISOLATED_ONLY" || !process.env.ARIMA_E2E_ENV_ID || !process.env.ARIMA_E2E_TARGET_MANIFEST)) {
  throw new Error("Refusing isolated Playwright run without explicit isolated environment confirmation.");
}
if (isolatedRun) {
  const manifest = readApprovedIsolatedTargetManifest();
  validateIsolatedTarget(configuredBaseURL as string, process.env.ARIMA_E2E_ENV_ID as string, manifest);
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  preserveOutput: "never",
  use: { baseURL: isolatedRun ? configuredBaseURL : "http://127.0.0.1:3000", trace: "off", screenshot: "off", video: "off" },
  ...(isolatedRun ? {} : {
    webServer: {
      command: "npm run start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
});
