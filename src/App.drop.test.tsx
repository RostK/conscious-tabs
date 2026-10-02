import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { DZCurrentData } from "./lib/Tabs/DnD";
import {
  dragFocusKey,
  isOwedFocus,
  oweFocusTo,
  setRowDragActive,
} from "./lib/Tabs/elements/rowControls.ts";
import { TabItem } from "./lib/Tabs/types.ts";
import { Theme } from "./lib/Theme";
import { installChrome } from "./test/chromeStub.ts";

/**
 * What `App` does when a drop reaches a zone.
 *
 * In jsdom a drag is never over anything: there is no layout, so dnd-kit's
 * collision detection finds no zone and every drop in `App.test.tsx` is "put
 * back". The code that runs when a drop *lands* — the zone's handler, and what
 * `App` does once it has resolved or rejected — was therefore reachable only
 * in a browser, which is how a rejected handler came to leave the drag flag on
 * (found in review, 2026-10-02).
 *
 * So this file keeps the real `DndContext` and only watches the props `App`
 * hands it, then calls `onDragStart` and `onDragEnd` the way dnd-kit would,
 * with a zone of this test's choosing. In its own file because the mock would
 * otherwise wrap every test in `App.test.tsx`.
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
      // where it throws — which arrived here as `props === undefined` and
      // wiped the record the first time anything warned.
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

const FIRST: TabItem = {
  type: "tab",
  id: 1,
  index: 0,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "First tab",
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

const endEvent = (zone: DZCurrentData, activator: "keydown" | "mousedown") =>
  ({
    over: { id: "tab--2", data: { current: zone } },
    activatorEvent: new Event(activator),
  }) as unknown as Parameters<NonNullable<DndProps["onDragEnd"]>>[0];

const end = (zone: DZCurrentData, activator: "keydown" | "mousedown") =>
  act(async () => {
    await props().onDragEnd?.(endEvent(zone, activator));
  });

const zoneWith = (dropHandler: DZCurrentData["dropHandler"]): DZCurrentData => ({
  type: "tab",
  data: { ...FIRST, id: 2, title: "The one in front" },
  dropHandler,
});

/** Right from a tab row's Select control moves on to Close, if the arrows are the row's. */
const arrowsWork = async () => {
  const select = screen.getByRole("button", { name: "Select Third tab" });
  select.focus();
  await userEvent.keyboard("{ArrowRight}");
  return document.activeElement !== select;
};

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
  oweFocusTo(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  setRowDragActive(false);
  oweFocusTo(undefined);
});

describe("a drop that reaches a zone", () => {
  it("runs the zone's handler with what was dragged", async () => {
    await mountApp();
    const handler = vi.fn().mockResolvedValue(undefined);
    const zone = zoneWith(handler);

    await start(FIRST);
    await end(zone, "keydown");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(FIRST, zone);
  });

  // The defect: with no `finally`, a handler that rejected skipped the lines
  // that end the drag, the flag stayed on, and Left/Right/Up did nothing on
  // any row until another drag happened to clear it.
  it("gives the arrows back when the handler rejects, and says the move failed", async () => {
    await mountApp();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = vi.fn().mockRejectedValue(new Error("Chrome said no"));

    await start(FIRST);
    await end(zoneWith(refused), "keydown");
    expect(refused).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(
        screen
          .getAllByRole("status")
          .some((region) =>
            region.textContent?.includes("That could not be moved there."),
          ),
      ).toBe(true),
    );
    expect(await arrowsWork()).toBe(true);
  });

  it("gives the arrows back when the handler resolves, too", async () => {
    await mountApp();
    const moved = vi.fn().mockResolvedValue(undefined);

    await start(FIRST);
    await end(zoneWith(moved), "keydown");
    expect(moved).toHaveBeenCalledTimes(1);

    expect(await arrowsWork()).toBe(true);
  });

  it("keeps the arrows for dnd-kit while the drag is still live", async () => {
    await mountApp();

    await start(FIRST);

    expect(await arrowsWork()).toBe(false);
  });
});

describe("who is owed focus, once a drop has landed", () => {
  const KEY = dragFocusKey("tab", 1);

  it("is the dropped row after a keyboard drop, while the handler is still running", async () => {
    await mountApp();
    let finish: () => void = () => {};
    const slow = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    await start(FIRST);
    let done: Promise<void> | void;
    act(() => {
      done = props().onDragEnd?.(endEvent(zoneWith(slow), "keydown"));
    });
    expect(slow).toHaveBeenCalledTimes(1);

    // Chrome's report of the move can rebuild the row before the handler
    // resolves, so the debt has to exist already.
    expect(isOwedFocus(KEY)).toBe(true);
    await act(async () => {
      finish();
      await done;
    });
  });

  it("is nobody after a pointer drop", async () => {
    await mountApp();
    const moved = vi.fn().mockResolvedValue(undefined);

    await start(FIRST);
    await end(zoneWith(moved), "mousedown");
    expect(moved).toHaveBeenCalledTimes(1);

    expect(isOwedFocus(KEY)).toBe(false);
  });

  // Found in review: the debt was only ever ended by its clock, so a row
  // dropped by keyboard and picked up again by pointer within three seconds
  // took focus when the pointer let go.
  it("is nobody once another drag has started", async () => {
    await mountApp();
    oweFocusTo(KEY);

    await start(FIRST);

    expect(isOwedFocus(KEY)).toBe(false);
  });

  it("is nobody after a cancel", async () => {
    await mountApp();
    oweFocusTo(KEY);

    act(() => {
      props().onDragCancel?.(
        {} as Parameters<NonNullable<DndProps["onDragCancel"]>>[0],
      );
    });

    expect(isOwedFocus(KEY)).toBe(false);
  });
});

/**
 * A drop onto a collapsed window, or a dropped selection, leaves no handle to
 * take focus back: measured in a browser, focus stayed on the body. The search
 * field takes it instead, once the list has had time to settle.
 *
 * On fake timers from the drop onward, so the tests wait for nothing and do
 * not depend on how long "settled" is: they run whatever timers the drop set.
 * The mount stays on real timers, because `waitFor` does not advance fake ones.
 */
describe("focus that nobody holds after a keyboard drop", () => {
  const search = () => screen.getByRole("textbox", { name: "search" });
  const dropOn = async (activator: "keydown" | "mousedown") => {
    await mountApp();
    const moved = vi.fn().mockResolvedValue(undefined);
    await start(FIRST);
    vi.useFakeTimers();
    await end(zoneWith(moved), activator);
    expect(moved).toHaveBeenCalledTimes(1);
  };
  const dropFocus = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.body).toHaveFocus();
  };

  it("goes to the search field at the first check, not before", async () => {
    await dropOn("keydown");
    dropFocus();

    vi.advanceTimersByTime(399);
    expect(document.body).toHaveFocus();
    vi.advanceTimersByTime(1);

    expect(search()).toHaveFocus();
  });

  // The handle can take focus and lose it again when Chrome's report of the
  // move lands, which is why there is a second check.
  it("goes there at the second check, if focus is lost after the first", async () => {
    await dropOn("keydown");
    const close = screen.getByRole("button", { name: "Close Third tab" });
    close.focus();

    vi.advanceTimersByTime(400);
    expect(close).toHaveFocus();
    dropFocus();
    vi.runOnlyPendingTimers();

    expect(search()).toHaveFocus();
  });

  it("is left alone when something already holds it", async () => {
    await dropOn("keydown");
    const close = screen.getByRole("button", { name: "Close Third tab" });
    close.focus();

    vi.runOnlyPendingTimers();

    expect(close).toHaveFocus();
  });

  it("is not touched after a pointer drop", async () => {
    await dropOn("mousedown");
    dropFocus();

    vi.runOnlyPendingTimers();

    expect(document.body).toHaveFocus();
  });

  // A press of the pointer is the user saying where focus should be,
  // including nowhere.
  it("is not touched once the user has pressed the pointer", async () => {
    await dropOn("keydown");
    dropFocus();

    fireEvent.pointerDown(document.body);
    vi.runOnlyPendingTimers();

    expect(document.body).toHaveFocus();
  });

  it("is not touched once a drag has been cancelled", async () => {
    await dropOn("keydown");
    dropFocus();

    act(() => {
      props().onDragCancel?.(
        {} as Parameters<NonNullable<DndProps["onDragCancel"]>>[0],
      );
    });
    vi.runOnlyPendingTimers();

    expect(document.body).toHaveFocus();
  });

  // While a tab row is being dragged it is off screen and focus sits on the
  // body by design. The last drop's check must not answer that.
  it("is not touched while a newer drag is live", async () => {
    await dropOn("keydown");
    dropFocus();

    await start(FIRST);
    vi.runOnlyPendingTimers();

    expect(document.body).toHaveFocus();
  });
});

/**
 * A drop is carried out asynchronously, so a second drag can begin while the
 * first one's handler is still running. The first one's tail must leave the
 * second alone.
 */
describe("a second drag begun while the first drop is still being carried out", () => {
  it("keeps its arrows when the first drop finishes", async () => {
    await mountApp();
    let finish: () => void = () => {};
    const slow = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await start(FIRST);
    let done: unknown;
    act(() => {
      done = props().onDragEnd?.(endEvent(zoneWith(slow), "keydown"));
    });
    expect(slow).toHaveBeenCalledTimes(1);

    await start(FIRST);
    await act(async () => {
      finish();
      await done;
    });

    // Still dnd-kit's: the second drag is live.
    expect(await arrowsWork()).toBe(false);
  });

  it("has the arrows back as soon as the drop is made, without waiting for it to finish", async () => {
    await mountApp();
    const never = vi.fn(() => new Promise<void>(() => {}));
    await start(FIRST);

    act(() => {
      void props().onDragEnd?.(endEvent(zoneWith(never), "keydown"));
    });

    expect(never).toHaveBeenCalledTimes(1);
    expect(await arrowsWork()).toBe(true);
  });
});

describe("what a refused drop leaves behind", () => {
  const says = (sentence: string) =>
    screen
      .getAllByRole("status")
      .some((region) => region.textContent?.includes(sentence));

  // So a second refusal is a change to the live region, and is read again.
  it("is cleared when the next drag starts", async () => {
    await mountApp();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await start(FIRST);
    await end(zoneWith(vi.fn().mockRejectedValue(new Error("no"))), "keydown");
    expect(says("That could not be moved there.")).toBe(true);

    await start(FIRST);

    expect(says("That could not be moved there.")).toBe(false);
  });
});

/**
 * `App` used to read `SelectionContext` above the `SelectionProvider` it
 * rendered itself. The `dispatch` it held was the context's default, which
 * does nothing, so a dropped selection stayed selected. Found the first time a
 * test could reach a drop that lands (2026-10-02), carried here as `it.fails`
 * until `App` became only the providers around an `AppBody`.
 */
describe("a selection that was dropped", () => {
  const THIRD = { ...FIRST, id: 3, index: 2, title: "Third tab" };
  const selectThird = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Select Third tab" }));
    await screen.findByRole("button", { name: "Deselect Third tab" });
  };
  const thirdIsSelected = () =>
    screen.queryByRole("button", { name: "Deselect Third tab" }) !== null;

  it("is cleared once the move has been made", async () => {
    await mountApp();
    await selectThird();
    const moved = vi.fn().mockResolvedValue(undefined);

    await start([THIRD]);
    await end(zoneWith(moved), "mousedown");

    expect(moved).toHaveBeenCalledTimes(1);
    expect(thirdIsSelected()).toBe(false);
  });

  // The tabs are still where they were, so they are still what the user has
  // in hand: clearing would make them pick the same tabs again to retry.
  it("stays selected when the move is refused", async () => {
    await mountApp();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await selectThird();
    const refused = vi.fn().mockRejectedValue(new Error("Chrome said no"));

    await start([THIRD]);
    await end(zoneWith(refused), "mousedown");

    expect(refused).toHaveBeenCalledTimes(1);
    expect(thirdIsSelected()).toBe(true);
  });

  // The clear belongs to a dropped selection. A single row dragged past a
  // selection the user is still building must leave it alone.
  it("is left alone when what was dropped is a single tab", async () => {
    await mountApp();
    await selectThird();
    const moved = vi.fn().mockResolvedValue(undefined);

    await start(FIRST);
    await end(zoneWith(moved), "mousedown");

    expect(moved).toHaveBeenCalledTimes(1);
    expect(thirdIsSelected()).toBe(true);
  });
});
