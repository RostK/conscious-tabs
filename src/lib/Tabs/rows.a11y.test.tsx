import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

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

const BASELINE: readonly [string, RowFixture, number][] = [
  [FIVE_TABS.name, FIVE_TABS, 5],
  [TWENTY_TABS.name, TWENTY_TABS, 20],
  [MIXED_WINDOWS.name, MIXED_WINDOWS, 8],
  [COLLAPSED_GROUP.name, COLLAPSED_GROUP, 2],
];

describe("AC-1 · nested-interactive, before the rows change", () => {
  it.each(BASELINE)(
    "%s reports one node per rendered row",
    async (_name, fixture, expected) => {
      const { container } = await renderList(fixture);

      const results = await runAxe(container, onlyNestedInteractive);

      expect(countNodes(results, NESTED_INTERACTIVE)).toBe(expected);
      // The count is a census of rows, not a backlog (spec §1.1): pin the
      // relationship as well as the figure, so a fixture that drifts to a
      // different size cannot keep the number and lose the meaning.
      expect(rowsOf(container)).toBe(expected);
    },
  );
});

describe("AC-9 · Tab stops, before the rows change", () => {
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
    // The controls that would make it 80 are all there, and all skipped: 3
    // per plain tab row, each at tabIndex -1 and reached with Left/Right.
    expect(container.querySelectorAll("[data-row-control]")).toHaveLength(60);
    expect(
      [...stops].every((stop) => !stop.hasAttribute("data-row-control")),
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

const DISABLES_THE_RULE = new RegExp(
  ["rules", "\\s*:\\s*\\{[^}]*", `["']${NESTED_INTERACTIVE}["']`].join(""),
);
const DISABLES_EVERYTHING_ELSE = new RegExp(["disable", "OtherRules"].join(""));

describe("AC-2 · no axe configuration disables the rule", () => {
  it("recognises both ways of doing it", () => {
    expect(
      DISABLES_THE_RULE.test(`axe.run(el, { rules: { "${NESTED_INTERACTIVE}": { enabled: false } } })`),
    ).toBe(true);
    expect(
      DISABLES_THE_RULE.test(`{ rules: {\n  '${NESTED_INTERACTIVE}': { enabled: false },\n} }`),
    ).toBe(true);
    expect(DISABLES_EVERYTHING_ELSE.test("{ disableOtherRules: true }")).toBe(
      true,
    );
    // A narrowing `runOnly` is how a run is meant to be scoped.
    expect(
      DISABLES_THE_RULE.test(
        `{ runOnly: { type: "rule", values: ["${NESTED_INTERACTIVE}"] } }`,
      ),
    ).toBe(false);
  });

  it("finds neither anywhere in src/", () => {
    const files = sourceFiles(SRC).filter(
      (file) => relative(SRC, file).replace(/\\/g, "/") !== SELF,
    );
    // A scan of nothing passes trivially; make sure it can see the helper.
    expect(files.map((file) => relative(SRC, file).replace(/\\/g, "/"))).toContain(
      "test/axe.ts",
    );

    const offenders = files.filter((file) => {
      const text = readFileSync(file, "utf8");
      return DISABLES_THE_RULE.test(text) || DISABLES_EVERYTHING_ELSE.test(text);
    });

    expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
  });
});
