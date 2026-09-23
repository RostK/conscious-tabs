import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { useTabsStructure } from "../useTabsStructure.ts";
import { SyncPrompt } from "./SyncPrompt.tsx";

const enqueueSnackbar = vi.fn();
vi.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbar(...args),
  closeSnackbar: vi.fn(),
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

  // Losing a real undo is worse than an extra prompt, so before the first
  // query has landed there is nothing to filter against and everything counts.
  it("prompts for anything closed before the first query lands", async () => {
    render(<SyncPrompt />); // no subscriber, so no snapshot

    removed(4242);

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
  });
});
