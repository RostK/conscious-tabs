import { fireEvent, render, waitFor } from "@testing-library/react";
import { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { useTabsStructure } from "../useTabsStructure.ts";
import { PROMPT_DURATION, SyncPrompt } from "./SyncPrompt.tsx";

const enqueueSnackbar = vi.fn();
const closeSnackbar = vi.fn();
vi.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbar(...args),
  closeSnackbar: (...args: unknown[]) => closeSnackbar(...args),
}));

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal" },
];

const LISTED = {
  id: 5,
  index: 0,
  windowId: 1,
  groupId: -1,
  active: false,
  title: "A tab the manager shows",
  url: "https://example.com/",
};

/** SyncPrompt reads the store; something has to be subscribed to fill it. */
const Probe = () => {
  useTabsStructure();
  return null;
};

const removed = (tabId: number) =>
  (
    chrome.tabs.onRemoved as unknown as {
      fire: (id: number, info: unknown) => void;
    }
  ).fire(tabId, { windowId: 1, isWindowClosing: false });

beforeEach(() => {
  enqueueSnackbar.mockClear();
  closeSnackbar.mockClear();
  // The real one hands back a key that identifies the notice it raised, and
  // dismissing the right notice is part of what is under test here.
  let key = 0;
  enqueueSnackbar.mockImplementation(() => (key += 1));
  installChrome({ windows: WINDOWS, tabs: [LISTED] });
  // Replaced outright: the stub types this as returning never[], so
  // mockResolvedValue will not take a session.
  chrome.sessions.getRecentlyClosed = (async () => [
    { lastModified: 1, tab: { sessionId: "s1" } as chrome.tabs.Tab },
  ]) as unknown as typeof chrome.sessions.getRecentlyClosed;
});

/**
 * The float's window holds an about:blank tab of its own, so closing the float
 * fires onRemoved — and the prompt announced a tab closure the user never made,
 * offering to undo it. Only tabs the list was mirroring count.
 */
describe("what counts as a tab the user closed", () => {
  const renderPrompt = async () => {
    const view = render(
      <>
        <Probe />
        <SyncPrompt />
      </>,
    );
    // Let the store's first load land, so the snapshot is real.
    await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    return view;
  };

  it("prompts for a tab the manager was showing", async () => {
    await renderPrompt();

    removed(LISTED.id);

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
    expect(enqueueSnackbar.mock.calls[0][0]).toBe("Tab closed");
  });

  it("stays silent for a tab it never listed", async () => {
    await renderPrompt();

    removed(4242); // the float's own about:blank

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(enqueueSnackbar).not.toHaveBeenCalled();
  });

  /**
   * The filter must not depend on some other component happening to be
   * mounted: SyncPrompt holds the store open itself.
   */
  it("filters on its own, with nothing else subscribed", async () => {
    render(<SyncPrompt />);

    // its own subscription, not a sibling's
    await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));

    removed(4242);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(enqueueSnackbar).not.toHaveBeenCalled();
  });

  // Losing a real undo is worse than an extra prompt, so before the first
  // query has landed there is nothing to filter against and everything counts.
  it("prompts for anything closed before the first query lands", async () => {
    render(<SyncPrompt />); // no subscriber, so no snapshot

    removed(4242);

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
  });
});

/**
 * Chrome fires `onRemoved` once per tab and does not pace them, so one click
 * on "Close" can straddle the 200ms burst window. Closing nine tabs read
 * "3 tabs closed" and then, three seconds later, "6 tabs closed" — two notices
 * for one action, the first offering to undo a third of it.
 */
describe("a closure that arrives in waves", () => {
  const MANY = Array.from({ length: 9 }, (_, index) => ({
    ...LISTED,
    id: 11 + index,
    index,
    title: `Tab ${index + 1}`,
  }));

  /** Nine single-tab entries, newest first, as chrome.sessions returns them. */
  const CLOSED = Array.from({ length: 9 }, (_, index) => ({
    lastModified: 9 - index,
    tab: { sessionId: `s${9 - index}` } as chrome.tabs.Tab,
  }));

  const labels = () => enqueueSnackbar.mock.calls.map(([label]) => label);

  beforeEach(() => {
    installChrome({ windows: WINDOWS, tabs: MANY });
    chrome.sessions.getRecentlyClosed = (async () =>
      CLOSED) as unknown as typeof chrome.sessions.getRecentlyClosed;
  });

  const renderPrompt = async () => {
    const view = render(<SyncPrompt />);
    await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    return view;
  };

  /** A group of removals far enough apart to flush as its own burst. */
  const wave = async (ids: number[]) => {
    ids.forEach(removed);
    await new Promise((resolve) => setTimeout(resolve, 260));
  };

  /** Press UNDO on the notice raised by the nth call. */
  const undo = async (nth: number) => {
    const { action } = enqueueSnackbar.mock.calls[nth][1] as {
      action: (id: number) => ReactElement;
    };
    const { getByRole } = render(action(99));
    fireEvent.click(getByRole("button", { name: "UNDO" }));
    await waitFor(() => expect(chrome.sessions.restore).toHaveBeenCalled());
  };

  it("tells the user about the closure, not about each wave", async () => {
    await renderPrompt();

    await wave([11, 12, 13]);
    await wave([14, 15, 16, 17, 18, 19]);

    expect(labels()).toEqual(["3 tabs closed", "9 tabs closed"]);
    // Rewritten, not queued behind: with maxSnack=1 the half-count notice
    // would otherwise hold the screen for its full three seconds first.
    expect(closeSnackbar).toHaveBeenCalledWith(
      enqueueSnackbar.mock.results[0].value,
    );
  });

  // The count is only half of it: the UNDO on the merged notice has to put
  // back the tabs from the earlier waves too, not just the last one's.
  it("undoes every wave of the closure", async () => {
    await renderPrompt();

    await wave([11, 12, 13]);
    await wave([14, 15, 16, 17, 18, 19]);
    await undo(1);

    expect(chrome.sessions.restore).toHaveBeenCalledTimes(9);
  });

  /**
   * The merge window is the notice's own lifetime — a closure joins the one
   * the user can still press UNDO on. Past that they are separate acts, and
   * counting them together would offer to undo something already forgotten.
   */
  it(
    "starts a fresh count once the notice is gone",
    async () => {
      await renderPrompt();

      await wave([11]);
      await new Promise((resolve) => setTimeout(resolve, PROMPT_DURATION));
      await wave([12]);

      expect(labels()).toEqual(["Tab closed", "Tab closed"]);
    },
    PROMPT_DURATION + 7000,
  );

  // Undoing spends the session ids, so what follows is a new closure even if
  // it lands within the window.
  it("starts a fresh count after an undo", async () => {
    await renderPrompt();

    await wave([11, 12]);
    await undo(0);
    await wave([13]);

    expect(labels()).toEqual(["2 tabs closed", "Tab closed"]);
  });
});
