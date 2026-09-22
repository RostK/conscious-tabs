import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Deliberately separate from vite.config.ts.
 *
 * That config loads @crxjs/vite-plugin, which rewrites the manifest, emits a
 * service-worker loader and expects a real extension build. None of that means
 * anything under a test runner, and letting it run would couple every test to
 * the packaging step.
 *
 * Tests import the Vitest API explicitly rather than relying on globals: the
 * repo lints with `--max-warnings 0` against an eslint config that declares
 * only `env: { browser: true }`, so bare `describe` / `it` / `expect` would
 * fail `no-undef` and break the lint gate, not merely warn.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
