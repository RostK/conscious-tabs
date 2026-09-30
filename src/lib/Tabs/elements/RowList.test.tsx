import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoViolations,runAxe } from "../../../test/axe.ts";
import { EXTENSION_ORIGIN, installChrome } from "../../../test/chromeStub.ts";
import {
  COLLAPSED_GROUP,
  FIVE_TABS,
  MIXED_WINDOWS,
  renderList,
  ROW_FIXTURES,
  RowFixture,
  TWENTY_TABS,
} from "../../../test/rowFixtures.tsx";
import { SearchView } from "../../../views/SearchView/index.tsx";
import { TabsView } from "../../../views/TabsView/index.tsx";
import { DropPlaceholder } from "../DnD";
import { SelectionProvider } from "../selection";
import { RowList } from "./RowList.tsx";

// `isOver` comes from dnd-kit and needs a live drag to become true. Forcing it
// on the window row's dropzone is the only way to render the placeholder that
// sits beside the window header, which is where a listitem could nest.
const forceOver = vi.hoisted(() => ({ on: false }));
vi.mock("../DnD/useDropzone.tsx", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../DnD/useDropzone.tsx")>();
  return {
    ...actual,
    useDropzone: ((args: Parameters<typeof actual.useDropzone>[0]) => {
      const result = actual.useDropzone(args);
      return {
        ...result,
        isOver: forceOver.on && args.type === "in-window" ? true : result.isOver,
      };
    }) as typeof actual.useDropzone,
  };
});

beforeEach(() => {
  forceOver.on = false;
});
afterEach(() => {
  forceOver.on = false;
});

const STRUCTURE_RULES = {
  runOnly: {
    type: "rule" as const,
    values: ["aria-required-children", "aria-required-parent"],
  },
};

/** One `ListItemButton` per row, whatever the row kind. */
const rowsOf = (container: HTMLElement) =>
  container.querySelectorAll(".MuiListItemButton-root").length;

/** Search matches every fixture through the `example.com` URLs. */
const renderSearch = async (fixture: RowFixture) => {
  installChrome(fixture.build());
  const view = render(
    <SelectionProvider>
      <SearchView search="example" onMatches={() => undefined} />
    </SelectionProvider>,
  );
  // The fixture's own text, not "any item": the first row to render says
  // nothing about the last, and a count taken after only some of them are
  // there is a race rather than a measurement.
  await screen.findByText(fixture.ready);
  return view;
};

const EXPECTED_LISTITEMS: readonly [string, RowFixture, number][] = [
  [COLLAPSED_GROUP.name, COLLAPSED_GROUP, 2],
  [FIVE_TABS.name, FIVE_TABS, 5],
  [MIXED_WINDOWS.name, MIXED_WINDOWS, 8],
  [TWENTY_TABS.name, TWENTY_TABS, 20],
];

describe("AC-3 · one list, one item per row (TabsView)", () => {
  it.each(EXPECTED_LISTITEMS)(
    "%s renders a single list whose items are its rows",
    async (_name, fixture, expected) => {
      const { container } = await renderList(fixture);

      const list = screen.getByRole("list", { name: "Open tabs" });
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(expected);
      expect(rowsOf(container)).toBe(expected);
      expect(items.every((item) => list.contains(item))).toBe(true);
    },
  );

  it("never nests a list, or an item, inside an item (AC-4)", async () => {
    for (const fixture of ROW_FIXTURES) {
      const { container, unmount } = await renderList(fixture);

      for (const item of screen.getAllByRole("listitem")) {
        expect(within(item).queryAllByRole("list")).toHaveLength(0);
        expect(within(item).queryAllByRole("listitem")).toHaveLength(0);
      }
      expect(container.querySelectorAll("[role=list]")).toHaveLength(1);
      unmount();
    }
  });

  it("satisfies axe's list-structure rules on every fixture", async () => {
    for (const fixture of ROW_FIXTURES) {
      const { container, unmount } = await renderList(fixture);

      expectNoViolations(await runAxe(container, STRUCTURE_RULES));
      unmount();
    }
  });
});

// Search matches every fixture through its `example.com` URLs and renders no
// window rows (E-3), with groups always expanded. So these are not §1.1's
// numbers: the mixed fixture is its two windows' tabs — one plain, the group
// row and its two, two more plain, and window 2's one — and the collapsed
// group opens to its row and both tabs.
const EXPECTED_SEARCH_LISTITEMS: readonly [string, RowFixture, number][] = [
  [COLLAPSED_GROUP.name, COLLAPSED_GROUP, 3],
  [FIVE_TABS.name, FIVE_TABS, 5],
  [MIXED_WINDOWS.name, MIXED_WINDOWS, 7],
  [TWENTY_TABS.name, TWENTY_TABS, 20],
];

describe("AC-3 · one list, one item per row (SearchView)", () => {
  it.each(EXPECTED_SEARCH_LISTITEMS)(
    "%s renders a single list with a window-row-less shape (E-3)",
    async (_name, fixture, expected) => {
      const { container } = await renderSearch(fixture);

      expect(screen.getAllByRole("list")).toHaveLength(1);
      expect(screen.getAllByRole("listitem")).toHaveLength(expected);
      expect(rowsOf(container)).toBe(expected);
      expectNoViolations(await runAxe(container, STRUCTURE_RULES));
    },
  );
});

describe("E-4 / E-3 · nothing to show is not a list of zero", () => {
  it("TabsView renders no list when only this extension's pages are open", async () => {
    installChrome({
      windows: [{ id: 1, alwaysOnTop: false, type: "normal", focused: true }],
      tabs: [
        {
          id: 2,
          index: 0,
          windowId: 1,
          groupId: -1,
          url: `${EXTENSION_ORIGIN}index.html?host=anchor`,
        },
      ],
    });

    render(
      <SelectionProvider>
        <TabsView />
      </SelectionProvider>,
    );

    expect(await screen.findByText("No other tabs are open.")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("SearchView renders no list when nothing matches", async () => {
    installChrome(FIVE_TABS.build());

    render(
      <SelectionProvider>
        <SearchView search="zzz-no-such-tab" onMatches={() => undefined} />
      </SelectionProvider>,
    );

    expect(await screen.findByText(/No tabs match/)).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

/**
 * E-4 again, for the other way to have nothing: not having looked yet.
 *
 * The two reads behind each view resolve independently, and the empty-state
 * early return waits for both, so until they land the view falls through to
 * its list. Rendering `RowList` there announces "Open tabs, list, 0 items" on
 * every open, and `RowList` says it renders only when there are rows.
 *
 * One read is held at a time, so neither order can hide it: the windows land
 * first in practice, but a view must not depend on that.
 */
describe("E-4 · no list before there is a row to put in it", () => {
  /**
   * Holds one read until `release()` is called, and lets the others through.
   *
   * By hand, not by delay: a timer says "probably not yet" and a slow machine
   * makes that false, while a promise nobody has resolved cannot land early.
   * `landed` collects the reads that were let through, so a test can wait for
   * exactly them — the assertion that follows is then about a state that has
   * been reached, not one that is expected to have been by now.
   */
  const stall = (held: "tabs" | "windows") => {
    installChrome(FIVE_TABS.build());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const landed: Promise<unknown>[] = [];
    const wrap = <Args extends unknown[], Result>(
      read: (...args: Args) => Result,
      hold: boolean,
    ) =>
      ((...args: Args) => {
        if (hold) return gate.then(() => read(...args));
        const result = Promise.resolve(read(...args));
        landed.push(result);
        return result;
      }) as (...args: Args) => Result;

    chrome.tabs.query = wrap(
      chrome.tabs.query,
      held === "tabs",
    ) as typeof chrome.tabs.query;
    chrome.windows.getAll = wrap(
      chrome.windows.getAll,
      held === "windows",
    ) as typeof chrome.windows.getAll;
    chrome.tabGroups.query = wrap(
      chrome.tabGroups.query,
      false,
    ) as typeof chrome.tabGroups.query;

    return { release, landed };
  };

  const views = [
    [
      "TabsView",
      () => (
        <SelectionProvider>
          <TabsView />
        </SelectionProvider>
      ),
    ],
    [
      "SearchView",
      () => (
        <SelectionProvider>
          <SearchView search="example" onMatches={() => undefined} />
        </SelectionProvider>
      ),
    ],
  ] as const;

  const reads = ["tabs", "windows"] as const;

  for (const [name, view] of views) {
    for (const read of reads) {
      it(`${name} renders no list while the ${read} read is in flight`, async () => {
        const { release, landed } = stall(read);

        render(view());

        // The reads that were not held have been asked for, have answered, and
        // React has had its turn with the answers — only then is "no list" a
        // statement about a view holding half of what it needs.
        await waitFor(() => {
          expect(landed.length).toBeGreaterThan(0);
        });
        await act(async () => {
          await Promise.all(landed);
        });
        expect(screen.queryByRole("list")).toBeNull();

        // Precondition for the assertion above: the rows do arrive, and the
        // list with them — so its absence was not the view rendering nothing
        // at all.
        release();
        await waitFor(() => {
          expect(screen.getAllByRole("listitem")).toHaveLength(5);
        });
        expect(screen.getAllByRole("list")).toHaveLength(1);
      });
    }
  }
});

describe("AC-31 · a drop placeholder is a row, so it is an item (E-14)", () => {
  it("is a listitem between two rows and satisfies the list rules", async () => {
    const { container } = render(
      <RowList>
        <div role="listitem">before</div>
        <DropPlaceholder />
        <div role="listitem">after</div>
      </RowList>,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute("role", "listitem");
    expectNoViolations(await runAxe(container, STRUCTURE_RULES));
  });

  it("does not nest the window row's placeholder inside the window row's item", async () => {
    forceOver.on = true;
    const { container } = await renderList(MIXED_WINDOWS);

    // Two window rows, each now with a placeholder beside its header.
    expect(screen.getAllByRole("listitem")).toHaveLength(8 + 2);
    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).queryAllByRole("listitem")).toHaveLength(0);
    }
    expectNoViolations(await runAxe(container, STRUCTURE_RULES));
  });
});
