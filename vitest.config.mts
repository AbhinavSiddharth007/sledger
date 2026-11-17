import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // server-only throws outside a React Server Component. Tests run as plain Node modules.
      "server-only": path.resolve(import.meta.dirname, "tests/support/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
    include: ["tests/**/*.test.ts"],
    // The integration tests share one local database, so run files one at a time.
    fileParallelism: false,
  },
}));
