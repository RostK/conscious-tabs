import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { DZCurrentData } from "./lib/Tabs/DnD";
import { setRowDragActive } from "./lib/Tabs/elements/rowControls.ts";
import { TabItem } from "./lib/Tabs/types.ts";
import { Theme } from "./lib/Theme";
import { installChrome } from "./test/chromeStub.ts";

/**
 * What `App` does to the selection when a dragged selection reaches a zone.
 *
 * In jsdom a drag is never over anything: there is no layout, so dnd-kit's
 * collision detection finds no zone and no drop ever lands. So this file keeps
 * the real `DndContext` and only watches the props `App` hands it, then calls
 * `onDragStart` and `onDragEnd` the way dnd-kit would, with a zone of this
 * test's choosing. In its own file because the mock would otherwise wrap every
 * test in `App.test.tsx`.
 *
 * The same harness as `App.drop.test.tsx` on the `accessible-rows` branch,
 * which does not exist on this one; under another name so that the two do not
 * collide when the branches meet.
 */
type DndProps = ComponentProps<typeof import("@dnd-kit/core").DndContext>;
const handed = vi.hoisted<{ props?: unknown }>(() => ({}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: DndProps) => {
      // Only a real render. To print a warning, React in development calls
      // each function component in the stack once with no arguments, to read
      // where it throws — which arrives here as `props === undefined` and
      // would wipe the record the first time anything warned.
      if (props) handed.props = props;
      return <actual.DndContext {...props} />;
    },
  };
});

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal", focused: true },
];

const chromeTab = (over: Partial<chrome.tabs.Tab>) =>
  ({
    windowId: 1,
    groupId: -1,
    active: false,
    highlighted: false,
    url: "https://example.com/",
    ...over,
  }) as chrome.tabs.Tab;

const THIRD: TabItem = {
  type: "tab",
  id: 3,
  index: 2,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "Third tab",
};

const mountApp = async () => {
  render(
    <Theme>
      <App />
    </Theme>,
  );
  await waitFor(() =>
    expect(document.querySelectorAll("[data-tab-row]").length).toBeGreaterThan(
      0,
    ),
  );
};

// Throws rather than hand back the last test's props: a test that drove a drag
// before mounting would otherwise be talking to an App that is gone.
const props = () => {
  if (!handed.props) throw new Error("App is not mounted");
  return handed.props as DndProps;
};

/**
 * dnd-kit's events, reduced to the fields `App` reads.
 *
 * Each is wrapped in `act`: `onDragEnd` closes over the `dragging` state that
 * `onDragStart` sets, so the start has to have rendered before the end is
 * read off the props — an end called with the stale closure sees nothing
 * dragged and does nothing.
 */
const start = (drag: unknown) =>
  act(async () => {
    props().onDragStart?.({
      active: { id: 1, data: { current: drag } },
    } as unknown as Parameters<NonNullable<DndProps["onDragStart"]>>[0]);
  });

const end = (zone: DZCurrentData) =>
  act(async () => {
    try {
      await props().onDragEnd?.({
        over: { id: "tab--2", data: { current: zone } },
        activatorEvent: new Event("mousedown"),
      } as unknown as Parameters<NonNullable<DndProps["onDragEnd"]>>[0]);
    } catch {
      // What `App` does with a refusal — let it out, or catch it and say so —
      // is not this file's subject. Only what is left selected afterwards.
    }
  });

const zoneWith = (
  dropHandler: DZCurrentData["dropHandler"],
): DZCurrentData => ({
  type: "tab",
  data: { ...THIRD, id: 2, index: 1, title: "The one in front" },
  dropHandler,
});

// Every row's control has the same name until it is pressed, so the row is
// found by its title first.
const selectThird = () => {
  const row = screen.getByText("Third tab").closest("[data-tab-row]");
  const select = row?.querySelector('[aria-label="Select tab"]');
  if (!select) throw new Error("The third row has no Select control");
  fireEvent.click(select);
};
const selectedRows = () =>
  screen.queryAllByRole("button", { name: "Deselect tab" });

beforeEach(() => {
  installChrome({
    windows: WINDOWS,
    tabs: [
      chromeTab({ id: 1, index: 0, title: "First tab" }),
      chromeTab({ id: 2, index: 1, title: "The one in front", active: true }),
      chromeTab({ id: 3, index: 2, title: "Third tab" }),
    ],
  });
  handed.props = undefined;
  setRowDragActive(false);
});

afterEach(() => {
  setRowDragActive(false);
});

/**
 * `App` used to read `SelectionContext` above the `SelectionProvider` it
 * rendered itself. The `dispatch` it held was the context's default, which
 * does nothing, so a dropped selection stayed selected.
 */
describe("a selection that was dropped", () => {
  it("is cleared once the move has been made", async () => {
    await mountApp();
    selectThird();
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    const moved = vi.fn().mockResolvedValue(undefined);
    const zone = zoneWith(moved);

    await start([THIRD]);
    await end(zone);

    expect(moved).toHaveBeenCalledTimes(1);
    expect(moved).toHaveBeenCalledWith([THIRD], zone);
    expect(selectedRows()).toHaveLength(0);
  });

  // The tabs are still where they were, so they are still what the user has
  // in hand: clearing would make them pick the same tabs again to retry.
  it("stays selected when the move is refused", async () => {
    await mountApp();
    selectThird();
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    const refused = vi.fn().mockRejectedValue(new Error("Chrome said no"));

    await start([THIRD]);
    await end(zoneWith(refused));

    expect(refused).toHaveBeenCalledTimes(1);
    expect(selectedRows()).toHaveLength(1);
  });

  // The clear belongs to a dropped selection. A single row dragged past a
  // selection the user is still building must leave it alone.
  it("is left alone when what was dropped is a single tab", async () => {
    await mountApp();
    selectThird();
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    const moved = vi.fn().mockResolvedValue(undefined);

    await start({ ...THIRD, id: 1, index: 0, title: "First tab" });
    await end(zoneWith(moved));

    expect(moved).toHaveBeenCalledTimes(1);
    expect(selectedRows()).toHaveLength(1);
  });
});
