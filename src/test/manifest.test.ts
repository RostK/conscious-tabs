import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "../../manifest.json";
import { OPEN_COMMAND } from "../lib/commands.ts";

/**
 * The zero-host-permission, stores-nothing posture is a product promise, not
 * an implementation detail: it appears verbatim in PRIVACY.md and
 * store-listing.md. A feature that quietly added a permission would make a
 * published policy false, so this is a guard rather than a description.
 */
describe("manifest", () => {
  // SPEC-03 AC-6, which supersedes SPEC-01 AC-22: four became five when
  // favicons moved to the browser's own store. The fifth was bought
  // deliberately and is documented in all five places SPEC-01 AC-24 names —
  // see the test below, which is the thing that keeps them agreeing.
  it("requests exactly five permissions and no more", () => {
    expect(manifest.permissions).toEqual([
      "sidePanel",
      "tabs",
      "tabGroups",
      "sessions",
      "favicon",
    ]);
  });

  /**
   * SPEC-01 AC-24, made executable.
   *
   * It was written as a manual checklist for a permission nobody expected to
   * add. One was added, so the checklist becomes a test: a permission that
   * appears in the manifest and in none of the published documents is a
   * privacy policy that has quietly stopped being complete.
   */
  it.each([
    ["PRIVACY.md", "PRIVACY.md"],
    ["the published privacy policy", "store-assets/privacy-policy.html"],
    ["README.md", "README.md"],
    ["the store listing", "store-listing.md"],
  ])("names every permission in %s", (_label, file) => {
    const text = readFileSync(join(process.cwd(), file), "utf8");
    const missing = manifest.permissions.filter(
      (permission) => !text.includes(permission),
    );
    expect(missing).toEqual([]);
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

/**
 * SPEC-05 group A. The keyboard way in.
 *
 * `commands` is a manifest key, not a permission — it appears nowhere in
 * Chrome's permissions list and adds no install warning — so the five-permission
 * tests above are deliberately untouched by it, and neither policy document
 * changes. That is the claim; the manual sweep is what confirms it against a
 * real install, because no test can see a warning dialog.
 */
describe("the keyboard shortcut", () => {
  const commands: Record<
    string,
    { description?: string; suggested_key?: Record<string, string> }
  > = manifest.commands;
  const names = Object.keys(commands);

  /**
   * AC-1. Not a reserved name, and one command only.
   *
   * `_execute_action` would look simpler and is the thing someone will propose
   * again: it dispatches **no** `onCommand` event at all, so there is no
   * listener and therefore no branch on which surface to open. (`_execute_side_panel`
   * appears in search results and in no Chrome documentation — it does not exist.)
   * Chrome also caps an extension at four suggested shortcuts, so each one spent
   * is one fewer available later.
   */
  it("declares one command, and not a reserved one", () => {
    // Compared against the constant the worker and the notice both use, so a
    // rename that misses one of the three places fails here instead of
    // silently unbinding the shortcut.
    expect(names).toEqual([OPEN_COMMAND]);
    names.forEach((name) => {
      expect(name.startsWith("_execute")).toBe(false);
    });
  });

  // AC-4. The description is what `chrome://extensions/shortcuts` shows the
  // user; without one they are asked to rebind an internal id. Compared
  // against the key rather than against action.default_title, which is allowed
  // to read the same.
  it("describes itself in words, not by its id", () => {
    names.forEach((name) => {
      const { description } = commands[name];
      expect(description).toBeTruthy();
      expect(description).not.toBe(name);
    });
  });

  /**
   * AC-37, the executable form of the chord table.
   *
   * Chrome's own rules: every extension chord must carry Ctrl or Alt, and
   * `Ctrl+Alt` is refused outright to avoid colliding with AltGr. The deny-set
   * is the Chrome shortcuts that always win and cannot be overridden — a
   * suggested key that collides is not an error, it simply never registers,
   * which presents to the user as a key that does nothing.
   *
   * `Ctrl+Shift+A` is Chrome's own tab search, and is the one worth naming:
   * no Google source lists it as reserved against extensions, so its presence
   * here is inference from the general rule rather than a cited fact.
   */
  const TAKEN_BY_CHROME = [
    "A", // tab search
    "T", // reopen closed tab
    "B", // bookmarks bar
    "C", // inspect element
    "D", // bookmark all tabs
    "I", // devtools
    "J", // devtools console
    "M", // switch profile
    "N", // incognito window
    "O", // bookmark manager
    "W", // close window
  ].map((key) => `Ctrl+Shift+${key}`);

  it("suggests a chord Chrome will actually accept", () => {
    const chords = names.flatMap((name) =>
      Object.values(commands[name].suggested_key ?? {}),
    );
    expect(chords.length).toBeGreaterThan(0);

    chords.forEach((chord) => {
      expect(chord).toMatch(/Ctrl|Command|MacCtrl|Alt/);
      expect(chord).not.toMatch(/Ctrl\+Alt/);
      expect(TAKEN_BY_CHROME).not.toContain(chord);
    });
  });

  // At most four, and every one spent is one a later feature cannot have.
  it("stays within Chrome's four suggested shortcuts", () => {
    const suggested = names.filter((name) => commands[name].suggested_key);
    expect(suggested.length).toBeLessThanOrEqual(4);
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
