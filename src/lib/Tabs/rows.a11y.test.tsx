import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { countNodes, expectNoViolations, runAxe } from "../../test/axe.ts";
import {
  COLLAPSED_GROUP,
  FIVE_TABS,
  MIXED_WINDOWS,
  renderList,
  RowFixture,
  TWENTY_TABS,
} from "../../test/rowFixtures.tsx";

/**
 * SPEC-04's baseline: what axe says about the list as it is *today*.
 *
 * These assert the **violating** numbers, on purpose. T-2, T-4 and T-5 each
 * change what a row is, and each will turn one of these red; that is the
 * point. It is the proof AC-25 asks for: a check that is red against the tree
 * it was written against, so it cannot be a check that passes on anything.
 *
 * **Do not delete a case when it goes red.** T-7 converts them to
 * zero-violation assertions and keeps the numbers below in a comment, and
 * `plans/MANUAL-SWEEP-SPEC-04.md` §A carries them too. After T-2 there is no
 * "today" left to measure, and AC-1 and AC-9 are both comparisons with it.
 *
 * Measured 2026-09-30 against `main` at f99b6b2 with axe-core 4.13.0, which
 * matches the 2026-09-28 measurement in the spec (§1.1) on every figure.
 */

const NESTED_INTERACTIVE = "nested-interactive";
const onlyNestedInteractive = {
  runOnly: { type: "rule" as const, values: [NESTED_INTERACTIVE] },
};

/** One row per `ListItemButton`: tab, group and window rows all use it. */
const rowsOf = (container: HTMLElement) =>
  container.querySelectorAll(".MuiListItemButton-root").length;

/**
 * [name, fixture, nested-interactive nodes now, rows rendered].
 *
 * The third column moves as each row kind is converted. The fourth is the
 * fixture's row count, which is also what the third *was* before T-2 — one node
 * per row, on every row (spec §1.1). That is the falsification evidence AC-25
 * asks for: these four assertions were red the moment T-2 landed, at 5, 20, 8
 * and 2, and were then updated to what T-2 leaves behind. See MANUAL-SWEEP §A.
 *
 * After T-2 only tab rows are toolbars, so what remained was the group and
 * window rows not yet converted: 0 + 0, then 2 windows + 1 group, then 1 group.
 * T-4 took the group rows to zero, and these two went red at 3 -> 2 and 1 -> 0
 * the moment it landed, then were updated to what it leaves behind. T-5 took
 * the last two (the window rows) to zero: the mixed fixture went red at 2 -> 0
 * the moment it landed (`expected +0 to be 2`), and was updated to what it
 * leaves behind. Every fixture is now at zero; T-7 converts the lot.
 */
const BASELINE: readonly [string, RowFixture, number, number][] = [
  // was 5 before T-2
  [FIVE_TABS.name, FIVE_TABS, 0, 5],
  // was 20 before T-2
  [TWENTY_TABS.name, TWENTY_TABS, 0, 20],
  // was 8 before T-2, 3 after it (the two window rows and the group row), and
  // 2 after T-4 (the two window rows); 0 now that they are toolbars too (T-5)
  [MIXED_WINDOWS.name, MIXED_WINDOWS, 0, 8],
  // was 2 before T-2, and 1 after it (the group row); 0 now that it is a
  // toolbar (T-4). There is no window row in this fixture.
  [COLLAPSED_GROUP.name, COLLAPSED_GROUP, 0, 2],
];

describe("AC-1 · nested-interactive, while the rows are converted", () => {
  it.each(BASELINE)(
    "%s reports the rows not yet converted",
    async (_name, fixture, expected, rows) => {
      const { container } = await renderList(fixture);

      const results = await runAxe(container, onlyNestedInteractive);

      expect(countNodes(results, NESTED_INTERACTIVE)).toBe(expected);
      // The row count is pinned separately, so a fixture that drifts to a
      // different size cannot keep a number and lose what it was measuring.
      expect(rowsOf(container)).toBe(rows);
    },
  );
});

// T-4, through the real list: the group row inside `RowList`, with its
// `listitem`, and the count E-1 asks for — what the group holds, not what is
// rendered, so a collapsed group still says how many tabs it hides.
describe("AC-28, AC-29 · the group row in the list", () => {
  it("is one named toolbar with its chevron as the only stop, expanded or not", async () => {
    const open = await renderList(MIXED_WINDOWS);
    const openRow = screen.getByRole("toolbar", { name: /, group,/ });

    expect(openRow).toHaveAttribute("aria-label", "Reading, group, 2 tabs");
    expect(openRow.closest('[role="listitem"]')).not.toBeNull();
    expect(
      within(openRow).getByRole("button", { name: "Tabs", expanded: true }),
    ).toHaveAttribute("tabindex", "0");
    open.unmount();

    await renderList(COLLAPSED_GROUP);
    const shutRow = screen.getByRole("toolbar", { name: /, group,/ });

    // One tab of the group's is hidden by the collapse, and still counted.
    expect(shutRow).toHaveAttribute("aria-label", "Reading, group, 1 tab");
    expect(
      within(shutRow).getByRole("button", { name: "Tabs", expanded: false }),
    ).toHaveAttribute("tabindex", "0");
    expect(screen.queryByText("Hidden in group")).toBeNull();
  });
});

// T-5, through the real list: the window row inside `RowList`, with its
// `listitem`. The wording is a proposal awaiting a listen (WindowListItem's
// `toolbarName`), so the exact strings are asserted once, here and in
// WindowDisplay.test.tsx.
describe("AC-28, AC-29 · the window row in the list", () => {
  const windowToolbars = () =>
    screen.getAllByRole("toolbar", { name: /^Window \d/ });

  it("is one named toolbar per window, with its chevron as the only stop", async () => {
    await renderList(MIXED_WINDOWS);
    const [current, other] = windowToolbars();

    // Five tabs in the focused window (the group's two included), one in the
    // other. Only the focused one says so.
    expect(current).toHaveAttribute(
      "aria-label",
      "Window 1, 5 tabs, current window",
    );
    expect(other).toHaveAttribute("aria-label", "Window 2, 1 tab");
    expect(windowToolbars()).toHaveLength(2);

    for (const [row, expanded] of [
      [current, true],
      [other, false],
    ] as const) {
      expect(row.closest('[role="listitem"]')).not.toBeNull();
      const chevron = within(row).getByRole("button", {
        name: "Tabs",
        expanded,
      });
      expect(chevron).toHaveAttribute("tabindex", "0");
      expect([...row.querySelectorAll("[tabindex='0']")]).toEqual([chevron]);
    }
  });

  it("walks chevron, select, close, switch — the switch button last", async () => {
    await renderList(MIXED_WINDOWS);
    const [current] = windowToolbars();

    expect(
      [...current.querySelectorAll("[data-row-control]")].map((control) =>
        control.getAttribute("aria-label"),
      ),
    ).toEqual([
      "Tabs",
      "Select every tab in this window",
      "Close this window and its 5 tabs",
      "Switch to this window, 5 tabs",
    ]);
  });

  // The count alone is not a subject: two windows with the same number of tabs
  // have to be told apart, which is what the ordinal is for (D-7).
  it("tells apart two windows that hold the same number of tabs", async () => {
    await renderList({
      name: "two windows of two tabs",
      ready: "Tab 1",
      build: () => ({
        windows: [
          { id: 1, focused: true, type: "normal" },
          { id: 2, focused: false, type: "normal" },
        ],
        tabs: [
          { id: 1, windowId: 1, index: 0, title: "Tab 1", url: "https://a.test/1" },
          { id: 2, windowId: 1, index: 1, title: "Tab 2", url: "https://a.test/2" },
          { id: 3, windowId: 2, index: 0, title: "Tab 3", url: "https://a.test/3" },
          { id: 4, windowId: 2, index: 1, title: "Tab 4", url: "https://a.test/4" },
        ],
      }),
    });

    const names = windowToolbars().map((row) => row.getAttribute("aria-label"));
    expect(names).toEqual(["Window 1, 2 tabs, current window", "Window 2, 2 tabs"]);
    expect(new Set(names).size).toBe(names.length);
  });

  // `TabsView` drops a window with nothing to show, and the ordinal counts what
  // is rendered: the third window is "Window 2", not "Window 3".
  it("numbers the windows that are rendered, not every window there is", async () => {
    await renderList({
      name: "an empty window between two",
      ready: "Tab 1",
      build: () => ({
        windows: [
          { id: 1, focused: true, type: "normal" },
          { id: 2, focused: false, type: "normal" },
          { id: 3, focused: false, type: "normal" },
        ],
        tabs: [
          { id: 1, windowId: 1, index: 0, title: "Tab 1", url: "https://a.test/1" },
          { id: 3, windowId: 3, index: 0, title: "Tab 3", url: "https://a.test/3" },
        ],
      }),
    });

    expect(
      windowToolbars().map((row) => row.getAttribute("aria-label")),
    ).toEqual(["Window 1, 1 tab, current window", "Window 2, 1 tab"]);
  });

  // E-2: no window row, so nothing to name and nothing to number.
  it("renders no window toolbar for a single window", async () => {
    await renderList(FIVE_TABS);

    expect(screen.queryAllByRole("toolbar", { name: /^Window \d/ })).toEqual([]);
  });
});

describe("AC-9 · Tab stops — T-0 baseline, updated in T-2", () => {
  it("costs 20 stops for 20 plain tabs, not 80", async () => {
    const user = userEvent.setup();
    const { container } = await renderList(TWENTY_TABS);

    // Tab until focus leaves the list or comes round to somewhere already
    // visited, whichever is first. Bounded so a wrong answer is a failure,
    // not a hang.
    const stops = new Set<Element>();
    for (let press = 0; press < 200; press += 1) {
      await user.tab();
      const focused = document.activeElement;
      if (!focused || !container.contains(focused) || stops.has(focused)) break;
      stops.add(focused);
    }

    expect(stops.size).toBe(20);
    // 4 controls per plain tab row: the primary button, which is the one stop,
    // and three at tabIndex -1 reached with Left/Right. This was 60 before T-2
    // — the row itself was the stop and was not marked as a control — and is 80
    // now that the primary button is one. The stops are the same 20 either way.
    expect(container.querySelectorAll("[data-row-control]")).toHaveLength(80);
    expect(
      [...stops].every(
        (stop) =>
          stop.hasAttribute("data-row-control") &&
          stop.getAttribute("tabindex") === "0",
      ),
    ).toBe(true);
    // One per row, and none a secondary control.
    expect(container.querySelectorAll("[data-row-control]:not([tabindex='-1'])"))
      .toHaveLength(20);
    expect(
      [...stops].every((stop) => stop.hasAttribute("data-tab-row")),
    ).toBe(true);
  });
});

/**
 * `expectNoViolations` is what T-7 will hold the whole list to, so it has to
 * be seen failing on a real violation and saying where — a helper that throws
 * a bare count, or never throws, would let every later assertion pass for the
 * wrong reason.
 */
describe("expectNoViolations", () => {
  let host: HTMLElement | undefined;
  afterEach(() => {
    host?.remove();
    host = undefined;
  });

  it("names the offending element and carries axe's own message", async () => {
    host = document.createElement("div");
    // A button holding a button: the shape every row in this list has today.
    host.innerHTML =
      '<div id="offender" role="button" tabindex="0"><button id="inner">Close</button></div>';
    document.body.append(host);

    const results = await runAxe(host, onlyNestedInteractive);

    expect(() => {
      expectNoViolations(results, NESTED_INTERACTIVE);
    }).toThrow(/nested-interactive[\s\S]*#offender/);
    expect(() => {
      expectNoViolations(results);
    }).toThrow(/focusable/i);
  });

  it("passes on a tree with nothing wrong, and when scoped past what is wrong", async () => {
    host = document.createElement("div");
    host.innerHTML = '<button id="fine">Close</button>';
    document.body.append(host);

    const clean = await runAxe(host, onlyNestedInteractive);
    expect(() => {
      expectNoViolations(clean);
    }).not.toThrow();

    // A different rule's silence is not this rule's: scoping must not hide it.
    host.innerHTML =
      '<div id="offender" role="button" tabindex="0"><button>Close</button></div>';
    const broken = await runAxe(host, onlyNestedInteractive);
    expect(() => {
      expectNoViolations(broken, "image-alt");
    }).not.toThrow();
    expect(() => {
      expectNoViolations(broken, NESTED_INTERACTIVE);
    }).toThrow();
  });
});

/**
 * AC-2: the rule is cleared by changing the rows, never by switching it off.
 *
 * A disabled rule reports zero on every tree — including this one — so a green
 * assertion above would mean nothing. This reads the source rather than trust
 * a convention. The patterns are assembled from pieces so this file does not
 * contain the very text it forbids, and it is skipped by name for the same
 * reason.
 */
// Not `import.meta.url`: under jsdom it is an http URL, not a file one. Vitest
// runs from the package root, where `include` is already anchored.
const SRC = join(process.cwd(), "src");
const SELF = "lib/Tabs/rows.a11y.test.tsx";

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const DISABLES_EVERYTHING_ELSE = new RegExp(["disable", "OtherRules"].join(""));
// `axe.configure` changes what every later run does, from anywhere, and never
// passes through `runAxe`. Nothing here needs it, so its mere presence is the
// finding — whatever it is configured to do.
const CONFIGURES_AXE = new RegExp(["axe\\s*\\.\\s*", "configure\\b"].join(""));
const IMPORTS_CONFIGURE = new RegExp(
  ["import\\s*\\{[^}]*\\b", "configure\\b[^}]*\\}\\s*from\\s*[\"']axe-core"].join(""),
);
// The rule by any spelling a `rules` block would use: the string, the
// constant that holds it, or a camelCased key.
const NAMES_THE_RULE = /nested[-_]?interactive/i;

/**
 * The text of every `rules: {…}` or `rules: […]` value in `text`.
 *
 * Balanced by counting brackets, not by stopping at the first `}` — which is
 * what let `rules: { "color-contrast": {…}, "nested-interactive": {…} }` past
 * the first version of this scan. Brackets inside strings are not special-cased;
 * over-reading a block is the safe direction, and an unterminated one runs to
 * the end of the file.
 */
const rulesBlocks = (text: string): string[] => {
  const blocks: string[] = [];
  const opener = /\brules["']?\s*:\s*([[{])/g;
  for (let hit = opener.exec(text); hit; hit = opener.exec(text)) {
    const start = hit.index + hit[0].length - 1;
    let depth = 0;
    let end = text.length - 1;
    for (let at = start; at < text.length; at++) {
      const char = text[at];
      if (char === "{" || char === "[") depth++;
      if ((char === "}" || char === "]") && --depth === 0) {
        end = at;
        break;
      }
    }
    blocks.push(text.slice(start, end + 1));
  }
  return blocks;
};

const disablesTheRule = (text: string): boolean =>
  rulesBlocks(text).some((block) => NAMES_THE_RULE.test(block));

const switchesAxeOff = (text: string): boolean =>
  disablesTheRule(text) ||
  DISABLES_EVERYTHING_ELSE.test(text) ||
  CONFIGURES_AXE.test(text) ||
  IMPORTS_CONFIGURE.test(text);

describe("AC-2 · no axe configuration disables the rule", () => {
  it("recognises every way of doing it", () => {
    expect(
      disablesTheRule(`axe.run(el, { rules: { "${NESTED_INTERACTIVE}": { enabled: false } } })`),
    ).toBe(true);
    expect(
      disablesTheRule(`{ rules: {\n  '${NESTED_INTERACTIVE}': { enabled: false },\n} }`),
    ).toBe(true);
    // Not the first key: the old scan stopped at the first closing brace.
    expect(
      disablesTheRule(
        `{ rules: { "color-contrast": { enabled: true }, "${NESTED_INTERACTIVE}": { enabled: false } } }`,
      ),
    ).toBe(true);
    expect(
      disablesTheRule(
        `{\n  rules: {\n    "color-contrast": {\n      enabled: true,\n    },\n    "${NESTED_INTERACTIVE}": {\n      enabled: false,\n    },\n  },\n}`,
      ),
    ).toBe(true);
    // A computed key, through the constant this file itself uses.
    expect(
      disablesTheRule("{ rules: { [NESTED_INTERACTIVE]: { enabled: false } } }"),
    ).toBe(true);
    // The array form `axe.configure` takes.
    expect(
      disablesTheRule(
        `axe.configure({ rules: [{ id: "${NESTED_INTERACTIVE}", enabled: false }] })`,
      ),
    ).toBe(true);
    expect(switchesAxeOff("axe.configure({ reporter: 'v2' })")).toBe(true);
    expect(switchesAxeOff('import { configure } from "axe-core";')).toBe(true);
    expect(DISABLES_EVERYTHING_ELSE.test("{ disableOtherRules: true }")).toBe(
      true,
    );

    // A narrowing `runOnly` is how a run is meant to be scoped.
    expect(
      switchesAxeOff(
        `{ runOnly: { type: "rule", values: ["${NESTED_INTERACTIVE}"] } }`,
      ),
    ).toBe(false);
    // The rule named outside a `rules` block, and a `rules` block that does
    // not name it, are both fine.
    expect(
      switchesAxeOff(
        `const ID = "${NESTED_INTERACTIVE}"; const c = { rules: { "image-alt": { enabled: true } } };`,
      ),
    ).toBe(false);
  });

  it("finds none of it anywhere in src/", () => {
    const files = sourceFiles(SRC).filter(
      (file) => relative(SRC, file).replace(/\\/g, "/") !== SELF,
    );
    // A scan of nothing passes trivially; make sure it can see the helper.
    expect(files.map((file) => relative(SRC, file).replace(/\\/g, "/"))).toContain(
      "test/axe.ts",
    );

    // The runner has to name `disableOtherRules` to refuse it, and says so in
    // its comment, so the words alone cannot be held against it. It is still
    // held to the part that matters: no `rules` block naming the rule.
    const offenders = files.filter((file) => {
      const text = readFileSync(file, "utf8");
      return relative(SRC, file).replace(/\\/g, "/") === "test/axe.ts"
        ? disablesTheRule(text)
        : switchesAxeOff(text);
    });

    expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
  });

  // The scan reads syntax and can be walked around (`rules` passed by
  // reference, a key built at run time). The runner refuses the option itself.
  it("is backed by the runner, which refuses to switch anything off", async () => {
    const el = document.createElement("div");

    expect(() =>
      runAxe(el, {
        rules: { [NESTED_INTERACTIVE]: { enabled: false } },
      }),
    ).toThrow(/rules/);
    expect(() =>
      runAxe(el, {
        // Not in `RunOptions`: it belongs to `axe.configure`, which is why the
        // runner has to look for it by name.
        ...({ disableOtherRules: true } as object),
      }),
    ).toThrow(/disableOtherRules/);
    // An empty `rules` is still `rules`: the option's presence is the finding.
    expect(() => runAxe(el, { rules: {} })).toThrow(/rules/);
    // And runOnly, the sanctioned narrowing, is untouched.
    document.body.append(el);
    try {
      await expect(runAxe(el, onlyNestedInteractive)).resolves.toBeDefined();
    } finally {
      el.remove();
    }
  });
});
