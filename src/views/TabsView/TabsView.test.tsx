import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SelectionProvider } from "../../lib/Tabs/selection";
import { EXTENSION_ORIGIN, installChrome } from "../../test/chromeStub.ts";
import { TabsView } from "./index.tsx";

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal", focused: true },
];

const tab = (over: Partial<chrome.tabs.Tab> = {}) =>
  ({
    id: 1,
    index: 0,
    windowId: 1,
    groupId: -1,
    active: false,
    title: "Example",
    url: "https://example.com/",
    ...over,
  }) as Partial<chrome.tabs.Tab>;

const renderView = () =>
  render(
    <SelectionProvider>
      <TabsView />
    </SelectionProvider>,
  );

beforeEach(() => {
  installChrome({ windows: WINDOWS });
});

/**
 * E-4 and C-15, at the level the user actually meets them.
 *
 * `surfaces.test.ts` pins the helpers; this pins the list they were written
 * for. The hazard was concrete and shipped: the anchor tab appeared as an
 * ordinary row, carrying a close button that would kill the float, and the
 * float's own window appeared as a whole window row with a close control of
 * its own — a normal window by every field except `alwaysOnTop`.
 */
describe("what the list refuses to mirror", () => {
  it("leaves out this extension's own pages", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [
        tab({ id: 1, title: "An ordinary page" }),
        tab({ id: 2, title: "Conscious Tabs", url: `${EXTENSION_ORIGIN}index.html?host=anchor` }),
        tab({ id: 3, title: "Conscious Tabs", url: `${EXTENSION_ORIGIN}index.html` }),
      ],
    });

    renderView();

    expect(await screen.findByText("An ordinary page")).toBeInTheDocument();
    expect(screen.queryAllByText("Conscious Tabs")).toHaveLength(0);
  });

  // The float reports type "normal" and is distinguishable only by alwaysOnTop.
  it("leaves out the floating window, and everything in it", async () => {
    installChrome({
      windows: [
        ...WINDOWS,
        { id: 2, alwaysOnTop: true, type: "normal", focused: false },
      ],
      tabs: [
        tab({ id: 1, title: "An ordinary page" }),
        tab({ id: 2, windowId: 2, title: "", url: "about:blank" }),
      ],
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByText("An ordinary page")).toBeInTheDocument(),
    );
    expect(screen.queryByText("about:blank")).toBeNull();
  });
});

/**
 * E-9 / AC-18. Reachable in ordinary use precisely because of the filtering
 * above: close everything but the anchor tab and there is nothing left to
 * mirror. The float has to say so rather than go blank.
 */
describe("with nothing left to show", () => {
  it("says so instead of rendering an empty window", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ id: 2, url: `${EXTENSION_ORIGIN}index.html?host=anchor` })],
    });

    renderView();

    expect(await screen.findByText("No other tabs are open.")).toBeInTheDocument();
  });

  /**
   * Every browsing window gone — the anchor's own window closed out from under
   * a float that outlived it, or a profile left holding nothing but ours.
   *
   * The guard here used to be `allWindows.length > 0`, which could not tell
   * this apart from "the window read has not landed yet" and so stayed silent
   * for both. The view then rendered nothing whatsoever: no list, no message.
   */
  it("says so when there is no browsing window left at all", async () => {
    installChrome({ windows: [], tabs: [] });

    renderView();

    expect(
      await screen.findByText("No other tabs are open."),
    ).toBeInTheDocument();
  });

  // The first paint happens before the first query resolves; flashing the
  // empty state there would make every open look like a failure.
  it("does not flash the empty state before the first query resolves", () => {
    installChrome({ windows: WINDOWS, tabs: [tab()] });

    const { container } = renderView();

    expect(container.textContent).not.toContain("No other tabs are open.");
  });
});

/**
 * The empty state must mean "there is nothing to show", never "I have not
 * looked yet".
 *
 * The two queries behind this view resolve independently, and the windows one
 * is a single call where the tabs one is three plus a debounce — so the windows
 * arrive first, essentially always. Gating only on the windows therefore leaves
 * a stretch where the view knows about a window, knows about no tabs, and
 * concludes the browser is empty.
 */
describe("while the first queries are still in flight", () => {
  const slowTabs = (tabs: Partial<chrome.tabs.Tab>[], delayMs: number) => {
    installChrome({ windows: WINDOWS, tabs });
    const real = chrome.tabs.query;
    chrome.tabs.query = ((info?: chrome.tabs.QueryInfo) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(real(info ?? {}) as never), delayMs);
      })) as typeof chrome.tabs.query;
  };

  it("does not claim the browser is empty before the tabs arrive", async () => {
    slowTabs([tab({ id: 1, title: "An ordinary page" })], 50);

    renderView();

    // The windows have landed by now; the tabs have not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("No other tabs are open.")).toBeNull();

    expect(await screen.findByText("An ordinary page")).toBeInTheDocument();
  });
});

/**
 * Only the window the user is browsing in is open — and focus leaving every
 * browsing window does not count as browsing in none of them.
 *
 * It did. Pressing on the float focuses the float's own window, and pressing
 * on the side panel while Chrome is in the background focuses Chrome; either
 * way the list heard "no window is focused" ~20ms into the press and shut the
 * section being clicked. The row went with it, the release landed on whatever
 * slid up into its place, and the tab never switched.
 */
describe("which window is open", () => {
  const window = (id: number, focused: boolean) =>
    ({ id, alwaysOnTop: false, type: "normal", focused }) as Partial<
      chrome.windows.Window
    >;
  const tabs = [
    tab({ id: 1, windowId: 1, title: "In window one" }),
    tab({ id: 2, windowId: 2, title: "In window two" }),
  ];
  const focusMoves = async (
    stub: ReturnType<typeof installChrome>,
    windows: Partial<chrome.windows.Window>[],
    to: number,
  ) => {
    stub.windows.getAll.mockResolvedValue(windows as chrome.windows.Window[]);
    stub.windows.onFocusChanged.fire(to as never);
    // Past the store's debounce and its read.
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  it("keeps the last browsed window open while focus is outside them all", async () => {
    const stub = installChrome({
      windows: [window(1, true), window(2, false)],
      tabs,
    });
    renderView();
    expect(await screen.findByText("In window one")).toBeInTheDocument();

    await focusMoves(stub, [window(1, false), window(2, false)], -1);

    expect(screen.getByText("In window one")).toBeInTheDocument();
    expect(
      screen.getByRole("toolbar", { name: /^Window 1, 1 tab, current window/ }),
    ).toBeInTheDocument();
  });

  it("follows focus to another browsing window", async () => {
    const stub = installChrome({
      windows: [window(1, true), window(2, false)],
      tabs,
    });
    renderView();
    expect(await screen.findByText("In window one")).toBeInTheDocument();

    await focusMoves(stub, [window(1, false), window(2, true)], 2);

    expect(await screen.findByText("In window two")).toBeInTheDocument();
    expect(screen.queryByText("In window one")).toBeNull();
  });
});
