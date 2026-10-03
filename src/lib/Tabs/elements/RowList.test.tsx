import { DndContext } from "@dnd-kit/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoViolations,runAxe } from "../../../test/axe.ts";
import {
  ChromeFixtures,
  EXTENSION_ORIGIN,
  installChrome,
} from "../../../test/chromeStub.ts";
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
import { TabDisplay } from "../Tab/TabDisplay.tsx";
import { TabListItem } from "../Tab/TabListItem.tsx";
import { TabItem } from "../types.ts";
import { WindowDropzone } from "../Window/WindowDropzone.tsx";
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

/**
 * AC-31 gives what a drag inserts two ways to be legal: a `listitem`, or out of
 * the accessibility tree. It was a `listitem` at first. Found in review: that
 * made every placeholder, and every window's end zone, an empty item with no
 * name — a blank entry to anyone reading the list during a drag, and a list
 * whose size changed with every arrow press. They are out of the tree now. What
 * says where a drop would land is the drag's own announcement.
 */
describe("AC-31 · what a drag inserts is not a row, so it is not an item (E-14)", () => {
  /** A `TabGrid` that is in the document and not in the tree. */
  const notItems = (container: HTMLElement) => [
    ...container.querySelectorAll('.MuiGrid2-root[aria-hidden="true"]'),
  ];

  it("keeps a placeholder between two rows out of the tree, and satisfies the list rules", async () => {
    const { container } = render(
      <RowList>
        <div role="listitem">before</div>
        <DropPlaceholder />
        <div role="listitem">after</div>
      </RowList>,
    );

    const [placeholder, ...others] = notItems(container);
    expect(others).toHaveLength(0);
    expect(placeholder.previousElementSibling).toHaveTextContent("before");
    expect(placeholder.nextElementSibling).toHaveTextContent("after");
    // No role to be an unallowed child with, should it ever come back in.
    expect(placeholder).not.toHaveAttribute("role");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expectNoViolations(await runAxe(container, STRUCTURE_RULES));
  });

  it("adds nothing to the list's items when the window rows' placeholders show", async () => {
    forceOver.on = true;
    const { container } = await renderList(MIXED_WINDOWS);

    // Two window rows, each now with a placeholder beside its header, and
    // the same eight items as without them.
    expect(notItems(container)).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).queryAllByRole("listitem")).toHaveLength(0);
    }
    expectNoViolations(await runAxe(container, STRUCTURE_RULES));
  });

  // The end of a window is a zone with nothing in it, mounted for the whole of
  // every drag. A real pick-up, because that is what mounts it.
  it("keeps a window's end zone out of the tree for the length of a drag", async () => {
    installChrome();
    const row: TabItem = {
      type: "tab",
      id: 1,
      index: 0,
      windowId: 1,
      groupId: -1,
      active: false,
      highlighted: false,
      title: "First tab",
      url: "https://example.com/",
    };
    const { container } = render(
      <SelectionProvider>
        <DndContext>
          <RowList>
            <TabListItem tab={row} />
            <WindowDropzone window={{ id: 1 } as chrome.windows.Window} />
          </RowList>
        </DndContext>
      </SelectionProvider>,
    );
    expect(notItems(container)).toHaveLength(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    const handle = screen.getByRole("button", { name: "Reorder First tab" });
    handle.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(notItems(container)).toHaveLength(1));

    // The dragged row is still an item, and the zone has not become one.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expectNoViolations(await runAxe(container, STRUCTURE_RULES));

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(notItems(container)).toHaveLength(0));
  });
});

/**
 * SPEC-04 AM-3 / AC-3. RowList says ", n of N" on every tab row, after commit,
 * counted over the rows actually rendered.
 *
 * Every case that changes only a row's *place* is one where React has nothing
 * to do: `stableTab` hands back the same object, the row memo skips it, and its
 * base name is unchanged. Only the observer can renumber those, which is the
 * mechanism these are here to prove.
 */
describe("AM-3 · RowList numbers the tab rows", () => {
  // Tab rows only: group and window rows are toolbars too, but they are not
  // numbered, and `data-row-label` is the marker `RowList` itself counts by.
  const names = () =>
    screen
      .getAllByRole("toolbar")
      .filter((row) => row.hasAttribute("data-row-label"))
      .map((row) => row.getAttribute("aria-label"));

  const fire = (event: unknown) => {
    act(() => {
      (event as { fire: () => void }).fire();
    });
  };

  const tabRow = (id: number, over: Partial<chrome.tabs.Tab> = {}) => ({
    id,
    index: id - 1,
    windowId: 1,
    groupId: -1,
    active: false,
    highlighted: false,
    title: `Tab ${id}`,
    url: `https://example.com/${id}`,
    ...over,
  });

  const oneWindow = [
    { id: 1, alwaysOnTop: false, type: "normal" as const, focused: true },
  ];

  const renderTabs = async (fixtures: ChromeFixtures, ready: string) => {
    installChrome(fixtures);
    const view = render(
      <SelectionProvider>
        <TabsView />
      </SelectionProvider>,
    );
    await screen.findAllByText(ready);
    return view;
  };

  const searchOf = (text: string) => (
    <SelectionProvider>
      <SearchView search={text} onMatches={() => undefined} />
    </SelectionProvider>
  );

  const rowItem = (id: number): TabItem => ({
    type: "tab",
    id,
    index: id,
    windowId: 1,
    groupId: -1,
    active: false,
    highlighted: false,
    title: `Row ${id}`,
    url: "https://example.com/",
  });

  it("counts tab rows only, in order, and says the state each one is in", async () => {
    await renderList(MIXED_WINDOWS);

    // Two window rows and the group row are listitems but not tab rows: they
    // are neither numbered nor counted, so N is 5 and not 8.
    expect(names()).toEqual([
      "Plain tab, example.com, 1 of 5",
      "Grouped one, example.com, 2 of 5",
      "Grouped two, example.com, playing audio, 3 of 5",
      "Muted tab, example.com, muted, 4 of 5",
      "Another plain tab, example.com, 5 of 5",
    ]);
  });

  it("gives every row of twenty its own name", async () => {
    await renderList(TWENTY_TABS);

    expect(new Set(names()).size).toBe(20);
    expect(names()[0]).toBe("Tab 1, example.com, 1 of 20");
    expect(names()[19]).toBe("Tab 20, example.com, 20 of 20");
  });

  // AM-1: the same title on the same page is the same subject, and position is
  // what tells the two apart — where they used to be allowed to collide.
  it("tells two tabs with the same title on the same page apart", async () => {
    const same = { title: "Inbox", url: "https://mail.example.com/" };
    await renderTabs(
      { windows: oneWindow, tabs: [tabRow(1, same), tabRow(2, same)] },
      "Inbox",
    );

    expect(names()).toEqual([
      "Inbox, mail.example.com, 1 of 2",
      "Inbox, mail.example.com, 2 of 2",
    ]);
  });

  it("renumbers when a search filters the list down (1 … 3 of 3)", async () => {
    installChrome({
      windows: oneWindow,
      tabs: [
        tabRow(1, { title: "Alpha one" }),
        tabRow(2, { title: "Beta" }),
        tabRow(3, { title: "Alpha two" }),
        tabRow(4, { title: "Gamma" }),
        tabRow(5, { title: "Alpha three" }),
      ],
    });
    // Every URL matches this, so all five are listed to begin with.
    const view = render(searchOf("example"));
    await screen.findByText("Gamma");
    expect(names()).toHaveLength(5);
    expect(names()[2]).toBe("Alpha two, example.com, 3 of 5");

    view.rerender(searchOf("alpha"));

    await waitFor(() => {
      expect(names()).toEqual([
        "Alpha one, example.com, 1 of 3",
        "Alpha two, example.com, 2 of 3",
        "Alpha three, example.com, 3 of 3",
      ]);
    });
  });

  it("renumbers the rest when a row is closed", async () => {
    const fixtures = FIVE_TABS.build();
    await renderTabs(fixtures, FIVE_TABS.ready);
    expect(names()[4]).toBe("Tab 5, example.com, 5 of 5");

    fixtures.tabs!.splice(1, 1);
    fire(chrome.tabs.onRemoved);

    await waitFor(() => {
      expect(names()).toEqual([
        "Tab 1, example.com, 1 of 4",
        "Tab 3, example.com, 2 of 4",
        "Tab 4, example.com, 3 of 4",
        "Tab 5, example.com, 4 of 4",
      ]);
    });
  });

  it("does not count the tabs of a group that starts collapsed", async () => {
    await renderList(COLLAPSED_GROUP);

    expect(names()).toEqual(["Outside the group, example.com, 1 of 1"]);
  });

  it("drops the tabs of a group from N when it collapses", async () => {
    const fixtures: ChromeFixtures = {
      windows: oneWindow,
      groups: [
        {
          id: 500,
          title: "Reading",
          color: "purple",
          collapsed: false,
          windowId: 1,
        },
      ],
      tabs: [
        tabRow(1, { groupId: 500, title: "In group one" }),
        tabRow(2, { groupId: 500, title: "In group two" }),
        tabRow(3, { title: "Outside" }),
      ],
    };
    await renderTabs(fixtures, "Outside");
    expect(names()).toEqual([
      "In group one, example.com, 1 of 3",
      "In group two, example.com, 2 of 3",
      "Outside, example.com, 3 of 3",
    ]);

    // The stub hands out its `groups` array itself, not a copy, so the store's
    // last snapshot would change under it and the refresh would look like
    // nothing new (LEARNINGS 2026-09-24). Real Chrome answers with fresh
    // objects, so: a new array, and an answer that is a copy of it.
    fixtures.groups = [{ ...fixtures.groups![0], collapsed: true }];
    chrome.tabGroups.query = vi.fn(async () =>
      structuredClone(fixtures.groups),
    ) as unknown as typeof chrome.tabGroups.query;
    fire(chrome.tabGroups.onUpdated);

    await waitFor(() => {
      expect(names()).toEqual(["Outside, example.com, 1 of 1"]);
    });
  });

  it("follows a rename, an audio change and a selection on the same row, keeping its place", async () => {
    const fixtures = FIVE_TABS.build();
    await renderTabs(fixtures, FIVE_TABS.ready);
    const row = screen.getAllByRole("toolbar")[1];
    expect(row).toHaveAttribute("aria-label", "Tab 2, example.com, 2 of 5");

    fixtures.tabs![1] = { ...fixtures.tabs![1], title: "Renamed" };
    fire(chrome.tabs.onUpdated);
    await waitFor(() => {
      expect(row).toHaveAttribute("aria-label", "Renamed, example.com, 2 of 5");
    });

    fixtures.tabs![1] = { ...fixtures.tabs![1], audible: true };
    fire(chrome.tabs.onUpdated);
    await waitFor(() => {
      expect(row).toHaveAttribute(
        "aria-label",
        "Renamed, example.com, playing audio, 2 of 5",
      );
    });

    // Becoming the current tab changes the row's class and nothing in its
    // subtree, so this is the case only the attribute half of the observer
    // catches: a name that changed without a child being added or removed.
    fixtures.tabs![1] = { ...fixtures.tabs![1], active: true };
    fire(chrome.tabs.onActivated);
    await waitFor(() => {
      expect(row).toHaveAttribute(
        "aria-label",
        "Renamed, example.com, current tab, playing audio, 2 of 5",
      );
    });

    fireEvent.click(row, { ctrlKey: true });
    await waitFor(() => {
      expect(row).toHaveAttribute(
        "aria-label",
        "Renamed, example.com, current tab, playing audio, selected, 2 of 5",
      );
    });
    // Never a remount: the element the reader is on is the element that changed.
    expect(screen.getAllByRole("toolbar")[1]).toBe(row);
    expect(names()).toHaveLength(5);
  });

  // The pitfall in the plan: React and the observer both write `aria-label`.
  // React writes only when the name changes, and the observer re-numbers off the
  // data attribute that changes with it — so a render where nothing changed must
  // leave the position alone. A write on every render would erase it, and
  // nothing would put it back until the next mutation.
  it("keeps its position when a row re-renders with the same tab", async () => {
    const list = () => (
      <SelectionProvider>
        <RowList>
          <div role="listitem">
            <TabDisplay tab={rowItem(1)} />
          </div>
          <div role="listitem">
            <TabDisplay tab={rowItem(2)} />
          </div>
        </RowList>
      </SelectionProvider>
    );
    installChrome();

    const view = render(list());
    await act(async () => undefined);
    const numbered = [
      "Row 1, example.com, 1 of 2",
      "Row 2, example.com, 2 of 2",
    ];
    expect(names()).toEqual(numbered);

    // Fresh objects, equal contents: what a browser event's rebuild produces.
    // Read at once, without yielding: the observer runs in a microtask, and
    // anything it later put right would hide a render that had erased the
    // position in the meantime — a screen reader can be told in that gap.
    view.rerender(list());
    expect(names()).toEqual(numbered);
    await act(async () => undefined);
    expect(names()).toEqual(numbered);
  });

  // Bare elements, so nothing but RowList can be what puts a position on them:
  // a real row has favicons and effects whose own mutations would number a
  // list that never numbered itself.
  it("numbers what it mounts with at once, and follows rows added and removed", async () => {
    const row = (label: string) => (
      <div key={label} role="listitem" data-row-label={label} aria-label={label} />
    );
    const list = (...labels: string[]) => (
      <RowList>{labels.map(row)}</RowList>
    );
    const listed = () =>
      screen.getAllByRole("listitem").map((item) => item.getAttribute("aria-label"));

    const view = render(list("a", "b"));
    expect(listed()).toEqual(["a, 1 of 2", "b, 2 of 2"]);

    view.rerender(list("a", "x", "b"));
    await waitFor(() => {
      expect(listed()).toEqual(["a, 1 of 3", "x, 2 of 3", "b, 3 of 3"]);
    });

    view.rerender(list("b"));
    await waitFor(() => {
      expect(listed()).toEqual(["b, 1 of 1"]);
    });
  });

  // Found in review: the observer renumbered for every node that came or went
  // anywhere inside the list. A ripple is a span added on each press and each
  // keyboard focus, and a drop placeholder arrives and leaves on every change
  // of hover, so on the drag path each of those cost a query over every row
  // and two reads on each. Bare elements again, so the count is this file's.
  it("renumbers for rows, and not for anything else that comes and goes inside the list", async () => {
    const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
    render(
      <RowList>
        <div role="listitem" data-row-label="a" aria-label="a">
          <span data-testid="inside" />
        </div>
      </RowList>,
    );
    const list = screen.getByRole("list");
    const first = screen.getByRole("listitem");
    expect(first).toHaveAttribute("aria-label", "a, 1 of 1");
    const queried = vi.spyOn(list, "querySelectorAll");

    // What a ripple does: a node inside a row, there and gone again.
    const ripple = document.createElement("span");
    screen.getByTestId("inside").append(ripple);
    await settled();
    ripple.remove();
    await settled();
    // What a placeholder does: a node between rows that is not one.
    const placeholder = document.createElement("div");
    list.append(placeholder);
    await settled();
    placeholder.remove();
    await settled();

    expect(queried).not.toHaveBeenCalled();

    // A row arriving is still followed, and so is one that arrives wrapped.
    const wrapper = document.createElement("div");
    const second = document.createElement("div");
    second.setAttribute("role", "listitem");
    second.setAttribute("data-row-label", "b");
    wrapper.append(second);
    list.append(wrapper);
    await waitFor(() => {
      expect(second).toHaveAttribute("aria-label", "b, 2 of 2");
    });
    expect(first).toHaveAttribute("aria-label", "a, 1 of 2");

    wrapper.remove();
    await waitFor(() => {
      expect(first).toHaveAttribute("aria-label", "a, 1 of 1");
    });
  });

  it("leaves a row outside any list with the name it has on its own", () => {
    installChrome();
    render(
      <SelectionProvider>
        <TabDisplay tab={rowItem(1)} />
      </SelectionProvider>,
    );

    expect(names()).toEqual(["Row 1, example.com"]);
  });
});
