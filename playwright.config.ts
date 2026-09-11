import { defineConfig, devices } from "@playwright/test";

import { PORT } from "./e2e/branch-name";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // The suite writes to a shared list, so the tests must not race each other.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      // Mobile-first product, so the smoke tests run at phone size.
      use: { ...devices["Pixel 7"] },
    },
  ],
});
