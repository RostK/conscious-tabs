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
    /**
     * Four times Vitest's default of five seconds, for a slow runner.
     *
     * The tests that run axe over twenty rows take about 1.3 s on GitHub's
     * runners on an ordinary day. On 2026-10-03 one run got a runner nearly
     * four times slower across the board — the suite took 317 s where it had
     * taken 86 — and three of them finished at 5.1 to 5.4 s, past the limit.
     * Nothing about them had changed. A fourth test then failed for a reason
     * of its own making: a test that has timed out keeps running, and it
     * rendered its next fixture into the document the following test was
     * reading.
     *
     * So the limit is set by how slow a runner can be, not by how long a test
     * should take. It is still a limit: a test that hangs fails in twenty
     * seconds, not never.
     */
    testTimeout: 20_000,
  },
});
