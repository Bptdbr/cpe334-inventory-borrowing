import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts", "tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
