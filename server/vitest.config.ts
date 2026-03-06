import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 300000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: "file:./test.db",
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
    },
  },
});
