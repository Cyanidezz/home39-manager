import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Loading the in-memory Postgres (PGlite) can take several seconds when many test files start together.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
