import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * SPEC-04 AC-23: the three row-layout helpers have one definition each.
 *
 * They exist because the same behaviour — which controls a row reveals, how its
 * text keeps clear of them — was written out per row kind and had to be fixed
 * more than once (LEARNINGS 2026-09-28). A second copy is not caught by any
 * behavioural test, because the copy that is wrong is the one nobody renders
 * in the test; it is caught by counting declarations.
 *
 * This is a source scan, the same idiom as `manifest.test.ts` and the scan in
 * `rows.a11y.test.tsx`. Two questions are asked of it: is the *name* declared
 * more than once, and has its *body* been pasted under another name. The second
 * is the one that actually happened — a second class carried its own copy of
 * the six reveal selectors.
 */

// Not `import.meta.url`: under jsdom it is an http URL, not a file one. Vitest
// runs from the package root.
const SRC = join(process.cwd(), "src");

const posix = (path: string) => relative(SRC, path).replace(/\\/g, "/");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });

// Non-test source only: a test may declare a local stand-in without it being a
// second implementation, and `src/test/` holds helpers for tests.
const FILES = sourceFiles(SRC).map((path) => ({
  path: posix(path),
  text: readFileSync(path, "utf8"),
}));

const HOME = "lib/Tabs/elements/rowControls.ts";

const count = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].length;

const declarationsOf = (name: string) =>
  FILES.flatMap(({ path, text }) =>
    Array.from(
      { length: count(text, new RegExp(`\\b(?:const|let|var|function)\\s+${name}\\b`, "g")) },
      () => path,
    ),
  );

const filesContaining = (needle: string) =>
  FILES.filter(({ text }) => text.includes(needle)).map(({ path }) => path);

describe("the row layout helpers are each defined once", () => {
  it("can see the file that defines them", () => {
    // A scan of nothing passes trivially.
    expect(FILES.map(({ path }) => path)).toContain(HOME);
    // And the rows that use the helpers, so a copy in one would be seen.
    expect(FILES.length).toBeGreaterThan(20);
  });

  it.each(["rowControlsSx", "rowTailMaskSx", "rowTailReserveSx"])(
    "declares %s exactly once, in rowControls.ts",
    (name) => {
      expect(declarationsOf(name)).toEqual([HOME]);
    },
  );

  // The name can be unique while the body is pasted into a row under a
  // different one. Each of these is a line only the helper's body contains.
  it.each([
    ["rowControlsSx", '"&:hover .itemAction"'],
    ["rowTailMaskSx", "linear-gradient(to right, #000 calc(100% - "],
    ["rowTailReserveSx", "maxWidth: `calc(100% - "],
  ])("has no second copy of %s's body under another name", (_name, needle) => {
    expect(filesContaining(needle)).toEqual([HOME]);
  });
});
