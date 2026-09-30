import { render, screen } from "@testing-library/react";

import { SelectionProvider } from "../lib/Tabs/selection";
import { TabsView } from "../views/TabsView/index.tsx";
import { ChromeFixtures, installChrome } from "./chromeStub.ts";

/**
 * The four trees SPEC-04's numbers are quoted against, built once.
 *
 * Each fixture is a *builder*, not a value. `chromeStub` clones what
 * `tabs.query` hands out, but `windows` and `tabGroups` are returned as the
 * arrays they were given, so a shared constant would let one test's mutation
 * look like state the fixture always had (LEARNINGS 2026-09-24). Building anew
 * per use makes the question moot.
 *
 * `ready` is a title that is on screen once the list has rendered. Waiting on
 * it rather than on a count keeps the row count a thing the test *measures*: a
 * wait keyed on the expected number would time out on a wrong one instead of
 * reporting it.
 */
export interface RowFixture {
  name: string;
  build: () => ChromeFixtures;
  ready: string;
}

const win = (over: Partial<chrome.windows.Window> = {}) =>
  ({
    id: 1,
    alwaysOnTop: false,
    type: "normal",
    focused: true,
    ...over,
  }) as Partial<chrome.windows.Window>;

const tab = (id: number, over: Partial<chrome.tabs.Tab> = {}) =>
  ({
    id,
    index: id - 1,
    windowId: 1,
    groupId: -1,
    active: false,
    highlighted: false,
    title: `Tab ${id}`,
    url: `https://example.com/${id}`,
    ...over,
  }) as Partial<chrome.tabs.Tab>;

const group = (over: Partial<chrome.tabGroups.TabGroup> = {}) =>
  ({
    id: 500,
    title: "Reading",
    color: "purple",
    collapsed: false,
    windowId: 1,
    ...over,
  }) as Partial<chrome.tabGroups.TabGroup>;

const plainTabs = (count: number) =>
  Array.from({ length: count }, (_, at) => tab(at + 1));

/** One window, so no window row: the list is just the tabs. */
export const FIVE_TABS: RowFixture = {
  name: "5 plain tabs",
  build: () => ({ windows: [win()], tabs: plainTabs(5) }),
  ready: "Tab 5",
};

export const TWENTY_TABS: RowFixture = {
  name: "20 plain tabs",
  build: () => ({ windows: [win()], tabs: plainTabs(20) }),
  ready: "Tab 20",
};

/**
 * Two windows, one group, six tabs — one audible, one muted.
 *
 * Only the focused window is expanded (`WindowListItem` opens on
 * `window.focused`), so window 2 contributes its header and no tabs. Rendered:
 * two window rows, the group row, and five tab rows.
 */
export const MIXED_WINDOWS: RowFixture = {
  name: "2 windows, 1 group, 6 tabs",
  build: () => ({
    windows: [win({ id: 1, focused: true }), win({ id: 2, focused: false })],
    groups: [group({ id: 500, windowId: 1 })],
    tabs: [
      tab(1, { index: 0, title: "Plain tab" }),
      tab(2, { index: 1, groupId: 500, title: "Grouped one" }),
      tab(3, { index: 2, groupId: 500, title: "Grouped two", audible: true }),
      tab(4, {
        index: 3,
        title: "Muted tab",
        audible: true,
        mutedInfo: { muted: true },
      }),
      tab(5, { index: 4, title: "Another plain tab" }),
      tab(6, { index: 5, windowId: 2, title: "Other window" }),
    ],
  }),
  ready: "Another plain tab",
};

/**
 * One window, one collapsed group, two tabs — one inside the group. A
 * collapsed group renders its header and none of its tabs, so this is the
 * group row plus the one tab that sits outside it.
 */
export const COLLAPSED_GROUP: RowFixture = {
  name: "1 window, 1 collapsed group, 2 tabs",
  build: () => ({
    windows: [win()],
    groups: [group({ id: 500, collapsed: true })],
    tabs: [
      tab(1, { index: 0, groupId: 500, title: "Hidden in group" }),
      tab(2, { index: 1, title: "Outside the group" }),
    ],
  }),
  ready: "Outside the group",
};

export const ROW_FIXTURES: readonly RowFixture[] = [
  FIVE_TABS,
  TWENTY_TABS,
  MIXED_WINDOWS,
  COLLAPSED_GROUP,
];

/** Mount the real list the way the app does, and wait for it to render. */
export const renderList = async (fixture: RowFixture) => {
  installChrome(fixture.build());
  const view = render(
    <SelectionProvider>
      <TabsView />
    </SelectionProvider>,
  );
  await screen.findByText(fixture.ready);
  return view;
};
