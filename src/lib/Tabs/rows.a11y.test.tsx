import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { countNodes, expectNoViolations, runAxe } from "../../test/axe.ts";
import {
  COLLAPSED_GROUP,
  FIVE_TABS,
  MIXED_WINDOWS,
  renderList,
  ROW_FIXTURES,
  RowFixture,
  TWENTY_TABS,
} from "../../test/rowFixtures.tsx";
import { getHost } from "../host.ts";

/**
 * SPEC-04's accessibility checks over the whole list, run through the real
 * `TabsView`, in jsdom, with axe-core 4.13.0.
 *
 * **What this proves, and what it does not (A-3).** Zero violations here is
 * necessary and not sufficient. jsdom has no layout, no virtual cursor and no
 * accessibility-API bridge, so nothing in this file says how NVDA reads a row,
 * and nothing in it closes AC-27. Two things are worth knowing about what axe
 * *did* examine: `aria-required-children`, `button-name`, `nested-interactive`
 * and the rest of the structural and naming rules ran over real nodes (the
 * "rules that looked" case below asserts that), and `color-contrast` ran over
 * none — the title is `overflow: hidden`, jsdom gives it no size, and axe
 * treats the clipped text as out of scope.
 *
 * The first block is the AC-1 / AC-2 / AC-25 baseline. It was written *red*,
 * against the tree as it stood on `main` at f99b6b2 (measured 2026-09-30), and
 * it is the proof AC-25 asks for: a check that fails against the tree it was
 * written against cannot be a check that passes on anything. The numbers it
 * went red at are kept in a comment there, because after T-5 there is no
 * "today" left to measure and AC-1 and AC-9 are both comparisons with it.
 * `plans/MANUAL-SWEEP-SPEC-04.md` §A carries them too.
 */

// The mid-drag case below (AC-31) needs a dropzone to report `isOver` without a
// drag, and that is dnd-kit's to decide: it takes a real pointer, sensors and a
// layout that jsdom does not have. Forcing the answer at the hook renders the
// real `DropPlaceholder` where the real rows put it, and nothing else about the
// tree changes. Off by default and reset after every test, so every other case
// in this file sees the unmodified hook. (`RowList.test.tsx` does the same for
// the window row's dropzone only.)
const forceOver = vi.hoisted(() => ({ on: false }));
vi.mock("./DnD/useDropzone.tsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./DnD/useDropzone.tsx")>();
  return {
    ...actual,
    useDropzone: ((args: Parameters<typeof actual.useDropzone>[0]) => {
      const result = actual.useDropzone(args);
      return { ...result, isOver: forceOver.on ? true : result.isOver };
    }) as typeof actual.useDropzone,
  };
});

/** Elements this file moved into the document and React does not own. */
const addedToBody: Element[] = [];
afterEach(() => {
  forceOver.on = false;
  addedToBody.splice(0).forEach((el) => {
    el.remove();
  });
  window.history.replaceState(null, "", "/");
});

const NESTED_INTERACTIVE = "nested-interactive";
const onlyNestedInteractive = {
  runOnly: { type: "rule" as const, values: [NESTED_INTERACTIVE] },
};

/** One row per `ListItemButton`: tab, group and window rows all use it. */
const rowsOf = (container: HTMLElement) =>
  container.querySelectorAll(".MuiListItemButton-root").length;

/**
 * [name, fixture, rows rendered].
 *
 * `nested-interactive` was one node per row, on every row (spec §1.1), so the
 * numbers it began at are the row counts: **5, 20, 8 and 2**. They moved as each
 * row kind was converted, and each step was seen red before it was updated:
 *
 *   - T-2 made the tab rows toolbars. Left: 0 / 0 / 3 (the two window rows and
 *     the group row) / 1 (the group row).
 *   - T-4 made the group rows toolbars: 3 -> 2 and 1 -> 0.
 *   - T-5 made the window rows toolbars: 2 -> 0 (`expected +0 to be 2`).
 *
 * All four are zero now, which is what this asserts. The fixtures' row counts
 * are pinned beside it, so a fixture that drifts to a different size cannot
 * keep a zero and lose what it was measuring.
 */
const ROW_COUNTS: readonly [string, RowFixture, number][] = [
  [FIVE_TABS.name, FIVE_TABS, 5],
  [TWENTY_TABS.name, TWENTY_TABS, 20],
  [MIXED_WINDOWS.name, MIXED_WINDOWS, 8],
  [COLLAPSED_GROUP.name, COLLAPSED_GROUP, 2],
];

describe("AC-1 · nested-interactive is zero on every fixture", () => {
  it.each(ROW_COUNTS)(
    "%s has no nested-interactive nodes",
    async (_name, fixture, rows) => {
      const { container } = await renderList(fixture);

      const results = await runAxe(container, onlyNestedInteractive);

      // The matcher first, for the message: it names the node and carries axe's
      // own account of what is nested in what. The count is the assertion.
      expectNoViolations(results, NESTED_INTERACTIVE);
      expect(countNodes(results, NESTED_INTERACTIVE)).toBe(0);
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

/**
 * AC-6's automated half: the whole ruleset, not the one rule.
 *
 * `button-name` and `aria-command-name` are what AC-6 is about, and
 * `image-alt` is the regression guard SPEC-04 §1.5 asks for; none of them needs
 * naming, because nothing here narrows the run. Not `runOnly`, and not `rules`:
 * `runAxe` refuses the second on purpose, so a rule that is off cannot make a
 * count come out.
 *
 * **Where it runs.** Inside a `<main>`, which is where the list sits in the app
 * (`App.tsx`), and over that element rather than the page. Run over the page,
 * axe also asks `document-title`, `html-has-lang`, `landmark-one-main` and
 * `page-has-heading-one`, which are about `index.html` and the shell around the
 * list, and a fixture that renders only the list is a fragment of that page.
 * Those rules would fire for what the fixture leaves out, and the only way to
 * quiet them would be to switch them off. Putting the list in the landmark it
 * has in the app keeps every rule on and asks them the question that is
 * actually about this tree.
 *
 * `runAxe` asks for violations only, which is right for a count and wrong for
 * this: an axe run reports a rule it could not decide as `incomplete`, not as a
 * violation, so a violations-only run cannot tell "fine" from "could not tell".
 * This calls axe directly, with nothing narrowed, to see all of it.
 */
const renderInMain = async (fixture: RowFixture) => {
  const view = await renderList(fixture);
  const main = document.createElement("main");
  view.container.before(main);
  main.append(view.container);
  addedToBody.push(main);
  return { ...view, main };
};

const runFull = (el: Element) =>
  axe.run(el, {
    resultTypes: ["violations", "incomplete", "passes", "inapplicable"],
  });

const ruleIds = (results: axe.Result[]) => results.map(({ id }) => id).sort();

/**
 * Rules axe could not decide on these fixtures. **Empty, and it has to stay
 * visible:** a rule that lands here is neither passing nor failing, and an
 * assertion on `violations` alone would wave it through. A new entry turns this
 * red until someone has read it and either fixed the tree or written the rule
 * and the reason here.
 *
 * `color-contrast` is the rule jsdom cannot decide, and it is not here because
 * on this list it never gets as far as being undecided: see the last case in
 * the block below, which pins both.
 */
const EXPECTED_INCOMPLETE: string[] = [];

/** Rules that must have examined real nodes on every fixture. */
const MUST_HAVE_LOOKED = [
  "aria-allowed-attr",
  "aria-allowed-role",
  "aria-required-children",
  "aria-required-parent",
  "aria-roles",
  "button-name",
  "image-alt",
  "nested-interactive",
  "tabindex",
];

const EVERY_FIXTURE = ROW_FIXTURES.map((fixture) => [fixture.name, fixture] as const);

describe("AC-6 · the full ruleset over every fixture", () => {
  it.each(EVERY_FIXTURE)(
    "%s: no violations, and nothing left undecided",
    async (_name, fixture) => {
      const { main } = await renderInMain(fixture);

      const results = await runFull(main);

      expectNoViolations(results);
      expect(ruleIds(results.incomplete)).toEqual(EXPECTED_INCOMPLETE);
    },
  );

  // An empty `violations` is only a statement if the rules ran. A rule that is
  // inapplicable passes vacuously, which is how a renamed role would have gone
  // unnoticed.
  it.each(EVERY_FIXTURE)(
    "%s: the rules that matter looked at real nodes",
    async (_name, fixture) => {
      const { main } = await renderInMain(fixture);

      const results = await runFull(main);

      const looked = ruleIds(results.passes);
      expect(MUST_HAVE_LOOKED.filter((id) => !looked.includes(id))).toEqual([]);
    },
  );

  // The two halves of "incomplete is reported, not swallowed". The first shows
  // the reporting works, on a tree jsdom cannot judge, so the empty list above
  // is not an artefact of asking for the wrong result type. The second says what
  // the list's own text does instead of being undecided.
  it("reports a rule it cannot decide, so an empty list means something", async () => {
    const host = document.createElement("div");
    host.innerHTML = '<p style="color:#777;background:#fff">Some text</p>';
    document.body.append(host);
    addedToBody.push(host);

    const results = await runFull(host);

    expect(ruleIds(results.violations)).toEqual([]);
    // Contrast is computed from painted colours and layout; jsdom has neither,
    // so axe says it could not tell rather than guessing.
    expect(ruleIds(results.incomplete)).toEqual(["color-contrast"]);
  });

  it("does not examine the list's text for contrast at all", async () => {
    const { main } = await renderInMain(MIXED_WINDOWS);

    const results = await runFull(main);

    // Not a pass and not undecided: inapplicable. Every title is `noWrap`, which
    // is `overflow: hidden`, and jsdom gives it no size, so axe takes the text to
    // be clipped away and has nothing to measure. (A plain `<p>` is undecided,
    // above; the same `<p>` with `overflow: hidden` is inapplicable — measured.)
    // This is why a green run here says nothing about contrast, and why the
    // sweep owns it. If axe ever starts to judge this text, this goes red and
    // the figure above it needs reading.
    expect(ruleIds(results.inapplicable)).toContain("color-contrast");
    expect(ruleIds(results.passes)).not.toContain("color-contrast");
  });
});

/**
 * AC-31, E-14: a drop placeholder between two rows while a drag is on.
 *
 * **Precondition, and what this is not.** This is a structural stand-in for a
 * drag. No pointer moves, dnd-kit has no `active`, no row has been lifted out of
 * the list and no `DragOverlay` exists; `isOver` is simply forced on at
 * `useDropzone`, so every dropzone mounts the real `DropPlaceholder` where the
 * real rows would. AC-31's own Verify asks for "a `DropPlaceholder` mounted
 * between two rows", which is what this does. Whether the tree is right *during*
 * a live drag, and what NVDA says as the placeholder arrives and leaves, is the
 * manual sweep's §D (LEARNINGS 2026-09-24: an assertion about absence is a
 * precondition, not a property — so the cases below first show there is
 * something for the rules to be absent from).
 */
const STRUCTURE_RULES = {
  runOnly: {
    type: "rule" as const,
    values: ["aria-required-children", "aria-required-parent"],
  },
  resultTypes: ["violations", "passes"] as axe.resultGroups[],
};

/**
 * What the list owns, as the accessibility tree sees it: its children, reaching
 * through the wrappers that have no role, no aria and no tabindex (axe treats
 * those as transparent, which is why the `Grid` containers can sit there).
 */
const ownedBy = (parent: Element): Element[] =>
  [...parent.children].flatMap((child) => {
    const transparent =
      /^(DIV|SPAN)$/.test(child.tagName) &&
      !child.hasAttribute("role") &&
      !child.hasAttribute("tabindex") &&
      ![...child.attributes].some(({ name }) => name.startsWith("aria-"));
    return transparent ? ownedBy(child) : [child];
  });

/** A placeholder is a `listitem` with nothing in it; every real row has content. */
const isPlaceholder = (item: Element) => item.childElementCount === 0;

describe("AC-31 · a placeholder between two rows", () => {
  it("leaves the list owning only listitems, and the required-parent rules clean", async () => {
    forceOver.on = true;
    const { main } = await renderInMain(MIXED_WINDOWS);

    const items = screen.getAllByRole("listitem");
    const between = items.filter(
      (item, at) =>
        isPlaceholder(item) &&
        at > 0 &&
        at < items.length - 1 &&
        !isPlaceholder(items[at - 1]) &&
        !isPlaceholder(items[at + 1]),
    );

    // The precondition: placeholders are there, and at least one sits with a
    // real row on each side of it, in the order a reader meets them.
    expect(items.filter(isPlaceholder).length).toBeGreaterThan(1);
    expect(between.length).toBeGreaterThan(0);
    // And the rows are all still there beside them.
    expect(screen.getAllByRole("toolbar")).toHaveLength(8);

    const owned = ownedBy(screen.getByRole("list"));
    expect(owned.map((child) => child.getAttribute("role"))).toEqual(
      owned.map(() => "listitem"),
    );
    expect(owned).toHaveLength(items.length);

    const results = await axe.run(main, STRUCTURE_RULES);
    expect(countNodes(results, "aria-required-children")).toBe(0);
    expect(countNodes(results, "aria-required-parent")).toBe(0);
    expectNoViolations(results);
    // Both rules were asked and both looked: the list for its children, the
    // items for their parent.
    expect(ruleIds(results.passes)).toEqual([
      "aria-required-children",
      "aria-required-parent",
    ]);
  });

  // Seeing it fail on the shape it exists to catch. Without this the case above
  // could be green because the rules are blind to a placeholder, and the fix it
  // guards (a placeholder that is a `listitem`) could be undone unseen.
  it("would fail on a placeholder that is not a listitem", async () => {
    forceOver.on = true;
    const { main } = await renderInMain(MIXED_WINDOWS);
    const placeholder = screen
      .getAllByRole("listitem")
      .find(isPlaceholder) as HTMLElement;

    placeholder.setAttribute("role", "group");
    const results = await axe.run(main, STRUCTURE_RULES);

    expect(countNodes(results, "aria-required-children")).toBeGreaterThan(0);
  });
});

/**
 * AC-8, the unit half: the same key walk in all three hosts.
 *
 * Tab onto a row's primary control, Right through every control to the last,
 * Right again (which stays put: no wrapping, DEC-2 / NG-9), Left all the way
 * back, Left again (stays), and Up to the search field. The trace is the
 * accessible name of every stop, with the name of the toolbar it is in, and it
 * has to be the same sequence under the bare panel URL, `?host=anchor` and
 * `?host=float`. `getHost()` is what tells the surfaces apart, so a branch on it
 * anywhere in a row's keyboard handling or naming would show up as a difference.
 *
 * `TabsView` is what is mounted, as in every other case in this file, and the
 * search field belongs to `App`, so a stand-in carrying the one thing
 * `useRowKeys` looks for (`data-search-field`) is put in the page before the
 * list. That is the contract Up relies on, and the only part of the field this
 * walk touches. What this cannot show is the float at its real ~400 px, or a
 * real Document Picture-in-Picture window: that is the manual half of AC-8.
 */
const HOSTS = [
  ["panel", "/"],
  ["anchor", "/?host=anchor"],
  ["float", "/?host=float"],
] as const;

const accessibleName = (el: Element) =>
  el.getAttribute("aria-label") ?? (el.textContent ?? "").trim();

const where = () => {
  const control = document.activeElement as HTMLElement;
  const toolbar = control.closest('[role="toolbar"]');
  return `${toolbar ? accessibleName(toolbar) : "(outside a row)"} > ${accessibleName(control)}`;
};

const searchField = () => {
  const field = document.createElement("input");
  field.setAttribute("data-search-field", "");
  field.setAttribute("aria-label", "Search tabs");
  document.body.prepend(field);
  addedToBody.push(field);
  return field;
};

/** The row the walk goes along: a tab with all five controls. */
const WALKED_ROW = "Muted tab, ";

const walk = async (url: string, expectedHost: string) => {
  window.history.replaceState(null, "", url);
  expect(getHost()).toBe(expectedHost);
  const user = userEvent.setup();
  const view = await renderList(MIXED_WINDOWS);
  const field = searchField();
  const trace: string[] = [];
  const arrow = async (key: "Left" | "Right") => {
    const before = document.activeElement;
    await user.keyboard(`{Arrow${key}}`);
    const moved = document.activeElement !== before;
    trace.push(`${key}: ${moved ? "" : "stays on "}${where()}`);
    return moved;
  };

  field.focus();
  trace.push(`start: ${accessibleName(field)}`);
  // Tab until the walked row's primary control takes focus, recording every
  // stop on the way: the window chevrons, the group chevron, the plain rows.
  for (let press = 0; press < 40; press += 1) {
    await user.tab();
    trace.push(`Tab: ${where()}`);
    if (
      document.activeElement?.hasAttribute("data-tab-row") &&
      where().startsWith(WALKED_ROW)
    ) {
      break;
    }
  }
  expect(where().startsWith(WALKED_ROW)).toBe(true);

  // Right until it stays put, then Left until it does. Bounded, so a walk that
  // never stops is a failure and not a hang.
  for (let press = 0; press < 12 && (await arrow("Right")); press += 1);
  for (let press = 0; press < 12 && (await arrow("Left")); press += 1);

  await user.keyboard("{ArrowUp}");
  trace.push(`Up: ${accessibleName(document.activeElement as Element)}`);
  expect(document.activeElement).toBe(field);

  view.unmount();
  field.remove();
  return trace;
};

// Pinned, so "identical" is not "identical and empty". Read down: Tab lands on
// each window's chevron, the group's, and every tab row's `Switch` — one stop per
// row — until the muted one; Right then visits its four other controls in the
// order AC-30 asks for and stays on the last; Left comes back and stays on the
// first; Up leaves for the search field.
const PINNED_WALK = [
  "start: Search tabs",
  "Tab: Window 1, 5 tabs, current window > Tabs",
  "Tab: Plain tab, example.com, 1 of 5 > Switch",
  "Tab: Reading, group, 2 tabs > Tabs",
  "Tab: Grouped one, example.com, 2 of 5 > Switch",
  "Tab: Grouped two, example.com, playing audio, 3 of 5 > Switch",
  "Tab: Muted tab, example.com, muted, 4 of 5 > Switch",
  "Right: Muted tab, example.com, muted, 4 of 5 > Select Muted tab",
  "Right: Muted tab, example.com, muted, 4 of 5 > Unmute Muted tab",
  "Right: Muted tab, example.com, muted, 4 of 5 > Close Muted tab",
  "Right: Muted tab, example.com, muted, 4 of 5 > Reorder Muted tab",
  "Right: stays on Muted tab, example.com, muted, 4 of 5 > Reorder Muted tab",
  "Left: Muted tab, example.com, muted, 4 of 5 > Close Muted tab",
  "Left: Muted tab, example.com, muted, 4 of 5 > Unmute Muted tab",
  "Left: Muted tab, example.com, muted, 4 of 5 > Select Muted tab",
  "Left: Muted tab, example.com, muted, 4 of 5 > Switch",
  "Left: stays on Muted tab, example.com, muted, 4 of 5 > Switch",
  "Up: Search tabs",
];

describe("AC-8 · the key walk is the same in the panel, the anchor and the float", () => {
  it("walks one trace under all three hosts", async () => {
    const traces: Record<string, string[]> = {};
    for (const [host, url] of HOSTS) {
      traces[host] = await walk(url, host);
    }

    expect(traces.panel).toEqual(PINNED_WALK);
    expect(traces.anchor).toEqual(traces.panel);
    expect(traces.float).toEqual(traces.panel);
  });
});

/**
 * AC-16: selection is the select control's to report, never the row's.
 *
 * `aria-selected` is not supported on `toolbar` or on `listitem` (DEC-5), so
 * setting it would be invalid ARIA; `aria-multiselectable` belongs to a
 * `listbox`/`grid`, which this is not. The control reports its own state in its
 * *name*, as `Select ‹title›` / `Deselect ‹title›` — it carries no `aria-pressed`
 * or `aria-checked` — and the row's toolbar name adds `selected`. The spec's
 * wording says "pressed/checked"; what is implemented is the name pair, and that
 * is what is asserted.
 *
 * The absence is only a statement once something is selected, so the row is
 * selected first and the scan runs over the list as it stands then.
 */
describe("AC-16 · selection is reported by the select control, not the row", () => {
  const selectionAttributes = (container: HTMLElement) =>
    container.querySelectorAll("[aria-selected], [aria-multiselectable]");

  it("names the state on the control and the toolbar, and puts no aria-selected anywhere", async () => {
    // The controls are `pointer-events: none` until a row is hovered or focused,
    // which jsdom cannot do; the click is still the real one.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { container } = await renderList(MIXED_WINDOWS);
    const row = () =>
      screen.getByRole("toolbar", { name: /^Plain tab, example\.com/ });

    expect(row()).toHaveAttribute("aria-label", "Plain tab, example.com, 1 of 5");
    expect(
      within(row()).getByRole("button", { name: "Select Plain tab" }),
    ).toBeInTheDocument();
    expect(selectionAttributes(container)).toHaveLength(0);

    await user.click(
      within(row()).getByRole("button", { name: "Select Plain tab" }),
    );

    // Precondition: the row is selected, by every account the user is given.
    expect(row()).toHaveAttribute(
      "aria-label",
      "Plain tab, example.com, selected, 1 of 5",
    );
    expect(
      within(row()).getByRole("button", { name: "Deselect Plain tab" }),
    ).toBeInTheDocument();
    expect(
      within(row()).queryByRole("button", { name: "Select Plain tab" }),
    ).toBeNull();

    // The property: with a row selected, nothing in the list says so by
    // `aria-selected`, and nothing makes the list a multiselectable widget.
    expect(container.querySelectorAll("*").length).toBeGreaterThan(50);
    expect(selectionAttributes(container)).toHaveLength(0);
  });
});

/**
 * AC-29, across the mixed fixture: every toolbar is named, and no two share a
 * name.
 *
 * The spec only requires distinctness *where the subjects are distinct*, and
 * permits two tabs on the same page to share a name (AM-1, E-18). With AM-3's
 * ", n of N" every tab row's name carries its place in the list, so in fact no
 * two toolbars can share one, even for the same page, and that stronger fact is
 * what is asserted. The second case is the one that shows it: two tabs with the
 * same title and URL, whose names differ in nothing but the position.
 *
 * Names are read from `aria-label` and then looked up again by role and name,
 * so each one is also confirmed to be what the accessibility query resolves to,
 * once.
 */
describe("AC-29 · every toolbar has a name, and they are all different", () => {
  it("holds across the rows of the mixed fixture", async () => {
    await renderList(MIXED_WINDOWS);

    const toolbars = screen.getAllByRole("toolbar");
    // Two window rows, the group row, five tab rows.
    expect(toolbars).toHaveLength(8);
    const names = toolbars.map((toolbar) => toolbar.getAttribute("aria-label"));

    expect(names.every((name) => name !== null && name.trim() !== "")).toBe(true);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names as string[]) {
      expect(screen.getAllByRole("toolbar", { name })).toHaveLength(1);
    }
  });

  it("holds for two tabs on the same page, which differ only by position", async () => {
    await renderList({
      name: "the same page open twice",
      // The third tab is what the render waits for: a title that is on screen
      // twice cannot be waited on.
      ready: "Elsewhere",
      build: () => ({
        windows: [{ id: 1, focused: true, type: "normal" }],
        tabs: [
          { id: 1, windowId: 1, index: 0, title: "Same page", url: "https://a.test/x" },
          { id: 2, windowId: 1, index: 1, title: "Same page", url: "https://a.test/x" },
          { id: 3, windowId: 1, index: 2, title: "Elsewhere", url: "https://b.test/y" },
        ],
      }),
    });

    const [first, second] = screen.getAllByRole("toolbar");

    // Same subject: the base name — what React writes — is the same.
    expect(first.getAttribute("data-row-label")).toBe("Same page, a.test");
    expect(second.getAttribute("data-row-label")).toBe(
      first.getAttribute("data-row-label"),
    );
    // Different place: so the names are not.
    expect(first).toHaveAttribute("aria-label", "Same page, a.test, 1 of 3");
    expect(second).toHaveAttribute("aria-label", "Same page, a.test, 2 of 3");
  });
});

/**
 * NFR-6: axe-core is a test dependency and nothing that ships imports it.
 *
 * "Non-test" means everything under `src/` that is not a `*.test.ts(x)` file and
 * is not in `src/test/`, which holds this suite's helpers (`axe.ts` is the one
 * that imports it, on purpose). The scan reads syntax, so it recognises each
 * way a module is pulled in — static, bare, dynamic, `require` — and a subpath
 * of the package. It does not run `manifest.test.ts`'s checks or touch that
 * file: its permission mirror and storage scan (AC-20, AC-21) stay as they were.
 */
const IMPORTS_AXE =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']axe-core(?:\/[^"']*)?["']/;

const isTestCode = (file: string) => {
  const path = relative(SRC, file).replace(/\\/g, "/");
  return /\.test\.tsx?$/.test(path) || path.startsWith("test/");
};

describe("NFR-6 · no shipped file imports axe-core", () => {
  it("recognises every way of importing it", () => {
    for (const line of [
      'import axe from "axe-core";',
      "import axe from 'axe-core';",
      'import { run } from "axe-core";',
      'import * as axe from "axe-core"',
      'import "axe-core";',
      'const axe = await import("axe-core");',
      'const axe = require("axe-core");',
      'import axe from "axe-core/axe.min.js";',
      'export { default } from "axe-core";',
    ]) {
      expect(IMPORTS_AXE.test(line), line).toBe(true);
    }
    // Prose, and neighbours that are not it.
    for (const line of [
      "// axe-core 4.13.0 is a devDependency",
      'import { axe } from "vitest-axe";',
      'import axe from "./axe.ts";',
      'const note = "see axe-core";',
    ]) {
      expect(IMPORTS_AXE.test(line), line).toBe(false);
    }
  });

  it("finds it only in test code, and the declaration only in devDependencies", () => {
    const files = sourceFiles(SRC);
    const importing = files.filter((file) =>
      IMPORTS_AXE.test(readFileSync(file, "utf8")),
    );

    // A scan that sees nothing passes on anything: it has to find the helper.
    expect(importing.map((file) => relative(SRC, file).replace(/\\/g, "/"))).toEqual(
      expect.arrayContaining(["test/axe.ts"]),
    );
    expect(
      importing.filter((file) => !isTestCode(file)).map((file) => relative(SRC, file)),
    ).toEqual([]);

    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(manifest.devDependencies).toHaveProperty("axe-core");
    expect(manifest.dependencies ?? {}).not.toHaveProperty("axe-core");
  });
});
