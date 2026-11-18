import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

// The app runs against the local Supabase stack. `npm run db:start`, `npm run db:reset` and
// `npm run db:env` must have been run first, so .env.test.local exists.
const env = loadEnv("test", process.cwd(), "");
// Test code reads the same variables as the app, such as the secret key for test setup.
Object.assign(process.env, env);

export default defineConfig({
  testDir: "tests/e2e",
  // The tests share one database and one demo user, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env,
  },
});
