import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "../../manifest.json";

/**
 * The zero-host-permission, stores-nothing posture is a product promise, not
 * an implementation detail: it appears verbatim in PRIVACY.md and
 * store-listing.md. A feature that quietly added a permission would make a
 * published policy false, so this is a guard rather than a description.
 */
describe("manifest", () => {
  // AC-22.
  it("requests exactly four permissions and no more", () => {
    expect(manifest.permissions).toEqual([
      "sidePanel",
      "tabs",
      "tabGroups",
      "sessions",
    ]);
  });

  it("declares no host permissions", () => {
    expect(manifest).not.toHaveProperty("host_permissions");
    expect(manifest).not.toHaveProperty("optional_host_permissions");
  });

  // NG-3. A content script on the active tab would have been a viable
  // one-click opener for the float, and was rejected on this ground.
  it("declares no content scripts", () => {
    expect(manifest).not.toHaveProperty("content_scripts");
  });
});

const listSources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });

/**
 * AC-23, the half a test can actually carry.
 *
 * This proves only that *our* code does not write, and says nothing about MUI,
 * notistack, dnd-kit or react-hook-form. The criterion is met by inspecting
 * storage after a real float session; this is the cheap guard that catches us
 * regressing it ourselves.
 */
describe("storage-free posture", () => {
  const sources = listSources(join(process.cwd(), "src")).filter(
    (file) => !file.includes(`${sep}test${sep}`) && !/\.test\.tsx?$/.test(file),
  );

  it("has sources to scan", () => {
    expect(sources.length).toBeGreaterThan(30);
  });

  /**
   * Comments are stripped first. The very first run of this test failed on a
   * comment in shouldPrompt.ts explaining why `chrome.storage` is *not* used —
   * prose about avoiding an API is not a use of it, and that false positive
   * would recur every time someone documented the reasoning.
   *
   * Not a parser: the `[^:]` guard keeps `https://` intact and that is as far
   * as it goes. Good enough for a regression guard that a manual storage
   * inspection stands behind anyway.
   */
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it.each([
    ["chrome.storage", /\bchrome\s*\.\s*storage\b/],
    ["localStorage", /\blocalStorage\b/],
    ["sessionStorage", /\bsessionStorage\b/],
    ["IndexedDB", /\bindexedDB\b/i],
    ["document.cookie", /\bdocument\s*\.\s*cookie\b/],
  ])("never touches %s", (_label, pattern) => {
    const offenders = sources
      .filter((file) => pattern.test(code(file)))
      .map((file) => file.replace(process.cwd(), ""));
    expect(offenders).toEqual([]);
  });
});
