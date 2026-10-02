import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { reportFloatSearch } from "./lib/float";
import { dragInstructions } from "./lib/Tabs/DnD";
import {
  dragFocusKey,
  isOwedFocus,
  oweFocusTo,
  setRowDragActive,
} from "./lib/Tabs/elements/rowControls.ts";
import { Theme } from "./lib/Theme";
import { installChrome } from "./test/chromeStub.ts";

vi.mock("./lib/float", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/float")>()),
  reportFloatSearch: vi.fn(),
}));

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
    highlighted: false,
    title: "A tab",
    url: "https://example.com/",
    ...over,
  }) as chrome.tabs.Tab;

const TABS = [
  tab({ id: 1, index: 0, title: "First tab" }),
  tab({ id: 2, index: 1, title: "The one in front", active: true }),
  tab({ id: 3, index: 2, title: "Third tab" }),
];

const atHost = (search: string) =>
  window.history.replaceState(null, "", search);

const mountApp = async () => {
  const view = render(
    <Theme>
      <App />
    </Theme>,
  );
  await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
  // Waited on by attribute, not by text: the active tab's title is rendered
  // twice — once by `CurrentTab` above the list and once as its row — so
  // findByText would throw on the duplicate rather than wait for the list.
  await waitFor(() =>
    expect(document.querySelectorAll("[data-tab-row]").length).toBeGreaterThan(
      0,
    ),
  );
  return view;
};

beforeEach(() => {
  installChrome({ windows: WINDOWS, tabs: TABS });
  // `dragActive` is module state in rowControls.ts and the first thing the row
  // key handler reads. This file mounts the whole App including DndContext, so
  // a future test that starts a drag would leave it set and every key
  // assertion after it would fail talking about focus instead of about drags.
  setRowDragActive(false);
});

/**
 * The first tests to mount `App` at all.
 *
 * Initial focus used to be claimed in two places — `App` had none, and
 * `TabDisplay` autofocused the active tab's row — which is why these assert
 * that a row was *never asked* for focus rather than merely that it does not
 * have it. The end state looks identical either way while both still fire.
 */
describe("where the caret goes when a surface opens", () => {
  it("lands in the search field", async () => {
    await mountApp();

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  // AC-12: the measurable form of "lands in the field" is that what you type
  // arrives there, without a click first.
  it("takes what the user types without a click first", async () => {
    await mountApp();

    await userEvent.keyboard("doc");

    expect(screen.getByLabelText("search")).toHaveValue("doc");
  });

  /**
   * AC-11. `GroupListItem` never forwarded the `focus` prop, so a grouped
   * active tab autofocused even in search results — the prop was silently
   * wrong at one of its two call sites. It is deleted rather than threaded:
   * a contract nobody can see is not a contract.
   */
  it("never asks a row for focus", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    await mountApp();

    const rowsFocused = focus.mock.instances.filter(
      (element) =>
        element instanceof HTMLElement && element.matches("[data-tab-row]"),
    );
    expect(rowsFocused).toEqual([]);
  });
});

describe("one Down from the field", () => {
  // AC-14. Landing on the tab the user is already looking at is what the old
  // autofocus was for; it survives, one key press later and without the race.
  it("lands on the active tab's row, not the first one", async () => {
    await mountApp();

    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toHaveAttribute("data-active-tab");
    expect(document.activeElement).toHaveTextContent("The one in front");
  });

  it("lands on the first row when no tab is active", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ id: 1, title: "Only tab" })],
    });
    await mountApp();

    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toHaveAttribute("data-tab-row");
  });

  /**
   * The way back. `Down` put focus on a row and nothing brought it back:
   * `Shift+Tab` lands on whatever precedes the row in the DOM, not the field,
   * so the list was a one-way trip — reported from real use within a minute of
   * the shortcut shipping.
   */
  it("comes back to the field on Up", async () => {
    await mountApp();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAttribute("data-tab-row");

    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  // From any row, not only the first. Plain arrows are unbound between rows,
  // so there is no "previous row" meaning to displace — and a key that works
  // at the top and silently does nothing three rows down is worse than one
  // that does not exist.
  it("comes back from a row further down the list", async () => {
    await mountApp();
    await userEvent.keyboard("{ArrowDown}");
    const rows = document.querySelectorAll<HTMLElement>("[data-tab-row]");
    rows[rows.length - 1].focus();

    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  /**
   * The guard that reserves `Shift`+`↑` for SPEC-05 group B's range selection.
   * Without this test the guard can be deleted and every other test still
   * passes — plain Up keeps working — while Shift+Up starts yanking focus to
   * the search box, which would surface as "range selection is broken" in a
   * different file months later.
   */
  it("leaves a modified Up alone", async () => {
    await mountApp();
    await userEvent.keyboard("{ArrowDown}");
    const row = document.activeElement;

    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");

    expect(document.activeElement).toBe(row);
  });

  // The comment on the binding claims it works from a control inside a row,
  // which is why it lives on the row rather than on the row's own button. Both
  // other tests focus a row itself, so nothing held that claim up.
  // Since SPEC-04 T-2 the row is a toolbar and its focus target is the
  // primary button, so "a control inside a row" means a secondary control.
  it("comes back from a control inside a row", async () => {
    await mountApp();
    const control = document.querySelector<HTMLElement>(
      'main [role="toolbar"] [data-row-control]:not([data-tab-row])',
    );
    expect(control).not.toBeNull();
    control?.focus();
    expect(document.activeElement).toBe(control);

    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  /**
   * While a drag is live the arrows belong to dnd-kit. This is what makes that
   * true for Up, and it is load-bearing: the branch no longer stops
   * propagation, but it still moves focus, which would pull the caret out of a
   * row the user is dragging.
   */
  it("leaves Up alone while a drag is live", async () => {
    await mountApp();
    await userEvent.keyboard("{ArrowDown}");
    const row = document.activeElement;
    setRowDragActive(true);

    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(row);
  });

  // The field keeps every other key. A modified Down is somebody else's.
  it("leaves a modified Down alone", async () => {
    await mountApp();
    const field = screen.getByLabelText("search");

    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");

    expect(document.activeElement).toBe(field);
  });
});

/**
 * AC-28. Every surface, not just the one the tests happen to mount. The float
 * is a ~400px window and the anchor is an ordinary tab; the side panel is the
 * only one whose focus behaviour Chrome decides for us, and it is the one that
 * measured "no".
 */
describe("in every surface", () => {
  it.each([
    ["the side panel", "/"],
    ["the anchor tab", "/?host=anchor"],
    ["the float", "/?host=float"],
  ])("puts the caret in the field in %s", async (_label, url) => {
    atHost(url);

    await mountApp();

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  /**
   * AC-15, a regression guard rather than new behaviour. The float reports its
   * search to the anchor so closing it does not drop you on an unfiltered list
   * — but never on mount, which would hand the anchor an empty search the user
   * never typed. Focusing a field changes no value, and this is what says so.
   */
  it("does not report an empty search just because the float opened", async () => {
    atHost("/?host=float");

    await mountApp();

    expect(reportFloatSearch).not.toHaveBeenCalled();
  });
});

/**
 * Reordering, as far as jsdom can take it — SPEC-04 AC-11, AC-13, AC-14, AC-15
 * and AC-37.
 *
 * What is **not** here: AC-12's first clause, that an arrow press changes
 * dnd-kit's translation. jsdom has no layout, so the KeyboardSensor computes
 * from zero rects and the assertion would be about nothing. `over` is therefore
 * always null in these drags and a drop is always "put back"; where a drop lands
 * is covered as wording in `announcements.test.ts` and checked by hand
 * (sweep §D).
 */
describe("reordering from the keyboard", () => {
  // Module state, like the drag flag: a keyboard drop in one test would
  // otherwise leave its row owed focus in the next.
  afterEach(() => {
    oweFocusTo(undefined);
  });

  /** dnd-kit's own live region, not the app's polite one in <main>. */
  const spoken = () =>
    document.querySelector('[id^="DndLiveRegion"]')?.textContent ?? "";

  const handleOf = (title: string) =>
    screen.getByRole("button", { name: `Reorder ${title}` });

  /**
   * Which tabs `chrome.tabs.update` was asked to activate, once the activation
   * chain has had time to run.
   *
   * Switching is a few awaits long (`activateTab`), so asserting "not called"
   * straight after an event passes whether or not anything fired — it is only
   * ever too early. Instead the third row is activated *behind* whatever the
   * test did: its call lands last, a stray one from before it would already be
   * in the list, and waiting for it is waiting for the chain to have finished.
   */
  const activatedAfterAControl = async () => {
    const third = screen
      .getAllByRole("toolbar")
      .find((el) => el.textContent?.includes("Third tab")) as HTMLElement;
    fireEvent.click(third);
    await waitFor(() =>
      expect(chrome.tabs.update).toHaveBeenCalledWith(3, { active: true }),
    );
    return vi.mocked(chrome.tabs.update).mock.calls.map(([id]) => id);
  };

  const grouped = () => {
    installChrome({
      windows: WINDOWS,
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
        tab({ id: 1, index: 0, title: "Plain tab" }),
        tab({ id: 2, index: 1, title: "In the group", groupId: 500 }),
      ],
    });
  };

  // AC-11. Space and Enter both start a drag from the handle — and neither
  // activates the tab, which is what the old wrapper was for and the reason
  // Enter could not simply be left to the row's button.
  it.each([
    ["Space", " "],
    ["Enter", "{Enter}"],
  ])(
    "%s on the handle picks the row up and does not switch to it",
    async (_name, key) => {
      await mountApp();
      handleOf("First tab").focus();
      const focused: Element[] = [];
      const focus = vi
        .spyOn(HTMLElement.prototype, "focus")
        .mockImplementation(function (this: HTMLElement) {
          focused.push(this);
        });

      await userEvent.keyboard(key);
      focus.mockRestore();

      await waitFor(() => expect(spoken()).toBe("Picked up First tab."));
      // Nothing walked along the row: no control was asked for focus.
      expect(focused.filter((el) => el.matches("[data-row-control]"))).toEqual(
        [],
      );
      await userEvent.keyboard("{Escape}");
      expect(await activatedAfterAControl()).toEqual([3]);
    },
  );

  // The same promise from the other side. A real Space or Enter never reaches
  // a click here — dnd-kit prevents the keydown, and the row it came from is
  // gone by the keyup — so the case above does not exercise the handle's own
  // `onClick`. This one does: the handle sits inside the toolbar whose click
  // switches tabs, and a click that reached it would.
  it("does not switch to the tab when the handle itself is clicked", async () => {
    await mountApp();

    // fireEvent, not userEvent: at rest the control is `pointer-events: none`
    // (revealed by :hover, which jsdom does not evaluate), and userEvent refuses.
    fireEvent.click(handleOf("First tab"));

    expect(await activatedAfterAControl()).toEqual([3]);
  });

  // AC-15, in the DOM. Whatever the page called itself is text and only text:
  // §11, AC-24.
  it("speaks the app's words, and a hostile title as text", async () => {
    const hostile = `"><img src=x onerror=alert(1)>`;
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ id: 1, index: 0, title: hostile })],
    });
    await mountApp();
    handleOf(hostile).focus();

    await userEvent.keyboard(" ");
    await waitFor(() => expect(spoken()).toBe(`Picked up ${hostile}.`));
    expect(spoken()).not.toMatch(/draggable item/);
    expect(
      document.querySelector('[id^="DndLiveRegion"]')?.querySelector("img"),
    ).toBeNull();

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(spoken()).toBe(`Cancelled. ${hostile} put back.`),
    );
    expect(spoken()).not.toMatch(/draggable item/);
  });

  it("says the drop in words, not an id", async () => {
    await mountApp();
    handleOf("First tab").focus();

    await userEvent.keyboard(" ");
    await waitFor(() => expect(spoken()).toBe("Picked up First tab."));
    await userEvent.keyboard(" ");

    await waitFor(() => expect(spoken()).toBe("First tab put back."));
    expect(spoken()).not.toMatch(/draggable item|\d{3,}/);
  });

  // The handle's description, read on landing on it — through App's own
  // DndContext rather than a copy of its configuration.
  it("describes the handle with the instructions App configured", async () => {
    await mountApp();

    expect(handleOf("First tab")).toHaveAccessibleDescription(
      dragInstructions.draggable,
    );
  });

  // AC-13. A tab row unmounts while it is dragged and a new one is mounted on
  // the way out, so focus has to land on the *new* handle: dnd-kit restores it
  // in an animation frame, which is why this waits.
  // AC-37, the other end: once the drag is over the arrows walk the row again,
  // so the same two paths — cancel and drop — prove onDragCancel and onDragEnd
  // both clear the flag.
  it.each([
    ["cancelled with Escape", "{Escape}"],
    ["dropped with Space", " "],
  ])(
    "puts focus back on the handle and gives the arrows back when %s",
    async (_name, end) => {
      await mountApp();
      handleOf("First tab").focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(spoken()).toMatch(/^Picked up/));

      await userEvent.keyboard(end);

      await waitFor(() => {
        expect(document.activeElement).toBe(handleOf("First tab"));
      });
      const before = document.activeElement as HTMLElement;
      await userEvent.keyboard("{ArrowLeft}");
      expect(document.activeElement).not.toBe(before);
      expect(document.activeElement).toHaveAttribute("data-row-control");
      expect(document.activeElement?.closest('[role="toolbar"]')).toBe(
        before.closest('[role="toolbar"]'),
      );
    },
  );

  // E-6, the case the flag exists for. A group row does not unmount when it is
  // picked up, so its own key handler is still there for the first arrow of the
  // drag — and would move focus off the handle and stop the event before
  // dnd-kit saw it. Asserted through App's real handlers: only `onDragStart`
  // setting the flag can make this pass.
  it("keeps the arrows for dnd-kit while a group row it picked up is still mounted", async () => {
    grouped();
    await mountApp();
    const handle = handleOf("group Reading");
    handle.focus();

    await userEvent.keyboard(" ");
    await waitFor(() => expect(spoken()).toBe("Picked up group Reading."));
    // Still there: this is the row whose handler is the risk.
    expect(handle).toBeInTheDocument();

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(handle);

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(spoken()).toBe("Cancelled. Group Reading put back."),
    );
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).not.toBe(handle);
    expect(document.activeElement).toHaveAttribute("data-row-control");
  });

  // AC-14. The row keeps `onMouseDown`, so a pointer can still take hold of it
  // anywhere — the keyboard half moved to the handle, the mouse half did not.
  it("still starts a drag from a mouse press and a 10px move on the row body", async () => {
    await mountApp();
    const row = screen
      .getAllByRole("toolbar")
      .find((el) => el.textContent?.includes("First tab")) as HTMLElement;

    fireEvent.mouseDown(row, { button: 0, clientX: 5, clientY: 5 });
    // Below the activation distance nothing has started.
    fireEvent.mouseMove(document, { clientX: 8, clientY: 5 });
    expect(spoken()).toBe("");
    fireEvent.mouseMove(document, { clientX: 20, clientY: 5 });

    await waitFor(() => expect(spoken()).toBe("Picked up First tab."));
    fireEvent.mouseUp(document);
  });

  // AC-13, the half dnd-kit cannot do. A drop that moves a tab into a group
  // rebuilds its row, and the handle dnd-kit just focused is gone. App says
  // which row was dropped so the rebuilt handle can take focus back
  // (DragHandle.test.tsx has that half). Only a keyboard drop does: a pointer
  // never had focus on the handle, and a cancel moves nothing.
  describe("which row is owed focus afterwards", () => {
    const FIRST = dragFocusKey("tab", 1);

    it("is the dropped row, after a keyboard drop", async () => {
      await mountApp();
      handleOf("First tab").focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(spoken()).toBe("Picked up First tab."));
      expect(isOwedFocus(FIRST)).toBe(false);

      await userEvent.keyboard(" ");

      await waitFor(() => expect(spoken()).toBe("First tab put back."));
      expect(isOwedFocus(FIRST)).toBe(true);
      expect(isOwedFocus(dragFocusKey("tab", 3))).toBe(false);
    });

    it("is nobody, after a cancel", async () => {
      await mountApp();
      handleOf("First tab").focus();
      await userEvent.keyboard(" ");
      await waitFor(() => expect(spoken()).toBe("Picked up First tab."));

      await userEvent.keyboard("{Escape}");

      await waitFor(() => expect(spoken()).toMatch(/^Cancelled/));
      expect(isOwedFocus(FIRST)).toBe(false);
    });

    it("is nobody, after a drop made with the mouse", async () => {
      await mountApp();
      const row = screen
        .getAllByRole("toolbar")
        .find((el) => el.textContent?.includes("First tab")) as HTMLElement;
      fireEvent.mouseDown(row, { button: 0, clientX: 5, clientY: 5 });
      fireEvent.mouseMove(document, { clientX: 20, clientY: 5 });
      await waitFor(() => expect(spoken()).toBe("Picked up First tab."));

      fireEvent.mouseUp(document);

      await waitFor(() => expect(spoken()).toBe("First tab put back."));
      expect(isOwedFocus(FIRST)).toBe(false);
    });
  });
});
