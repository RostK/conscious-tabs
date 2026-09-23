import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../../test/chromeStub.ts";
import { TabItem } from "./types.ts";
import { useTabsStructure } from "./useTabsStructure.ts";

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal" },
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

const titles = (structure: ReturnType<typeof useTabsStructure>) =>
  (structure ?? []).map((item) =>
    item.type === "group" ? item.title : (item as TabItem).title,
  );

/** Hand out canned answers, each with its own delay, in call order. */
const answerQueriesWith = (
  answers: { tabs: Partial<chrome.tabs.Tab>[]; delayMs: number }[],
) => {
  let call = 0;
  chrome.tabs.query = (() => {
    const answer = answers[Math.min(call, answers.length - 1)];
    call += 1;
    return new Promise((resolve) => {
      setTimeout(
        () => resolve(answer.tabs as chrome.tabs.Tab[]),
        answer.delayMs,
      );
    });
  }) as unknown as typeof chrome.tabs.query;
};

beforeEach(() => {
  installChrome({ windows: WINDOWS, tabs: [tab()] });
});

/**
 * Each load is three awaited round trips, so one started earlier can finish
 * later. Whoever lands last used to win, which is not the same as whoever
 * asked last.
 */
describe("overlapping loads", () => {
  it("keeps the newest answer even when an older one lands after it", async () => {
    answerQueriesWith([
      { tabs: [tab({ id: 1, title: "STALE" })], delayMs: 80 },
      { tabs: [tab({ id: 2, title: "FRESH" })], delayMs: 0 },
    ]);

    const { result } = renderHook(() => useTabsStructure());

    // The mount load is the slow one; a browser event starts the fast one.
    await new Promise((resolve) => setTimeout(resolve, 20));
    (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();

    await waitFor(() => expect(titles(result.current)).toEqual(["FRESH"]));

    // Long enough for the slow answer to land and, unguarded, overwrite.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(titles(result.current)).toEqual(["FRESH"]);
  });
});

/**
 * The reason this became a store: five callers were each answering the same
 * event with their own three-call query.
 */
describe("several consumers", () => {
  it("share one query rather than one each", async () => {
    const first = renderHook(() => useTabsStructure());
    const second = renderHook(() => useTabsStructure());
    const third = renderHook(() => useTabsStructure());

    await waitFor(() => expect(first.result.current).toBeDefined());
    await waitFor(() => expect(second.result.current).toBeDefined());
    await waitFor(() => expect(third.result.current).toBeDefined());

    expect(chrome.tabs.query).toHaveBeenCalledTimes(1);

    vi.mocked(chrome.tabs.query).mockClear();
    (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();
    await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalledTimes(1));

    // And a burst collapses into one, rather than one per event per consumer.
    vi.mocked(chrome.tabs.query).mockClear();
    const fire = (chrome.tabs.onUpdated as unknown as { fire: () => void })
      .fire;
    [1, 2, 3, 4, 5].forEach(() => {
      fire();
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(chrome.tabs.query).toHaveBeenCalledTimes(1);
  });

  it("notices a tab the moment it is created", async () => {
    const tabs = [tab({ id: 1, title: "First" })];
    installChrome({ windows: WINDOWS, tabs });

    const { result } = renderHook(() => useTabsStructure());
    await waitFor(() => expect(titles(result.current)).toEqual(["First"]));

    // The stub queries the same array, so this is a tab Chrome now has.
    tabs.push(tab({ id: 2, title: "Brand new" }));
    (chrome.tabs.onCreated as unknown as { fire: () => void }).fire();

    await waitFor(() =>
      expect(titles(result.current)).toEqual(["First", "Brand new"]),
    );
  });

  /**
   * A read that failed says nothing about what the browser holds. Wiping the
   * list on a rejection would turn a transient API failure into an empty
   * manager; dropping the promise turns it into an unhandled rejection.
   */
  it("keeps the last snapshot when a read fails, and recovers after", async () => {
    const tabs = [tab({ id: 1, title: "First" })];
    installChrome({ windows: WINDOWS, tabs });
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useTabsStructure());
    await waitFor(() => expect(titles(result.current)).toEqual(["First"]));

    const real = chrome.tabs.query;
    chrome.tabs.query = (() =>
      Promise.reject(
        new Error("window is going away"),
      )) as typeof chrome.tabs.query;
    (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(titles(result.current)).toEqual(["First"]);
    expect(logged).toHaveBeenCalled();

    chrome.tabs.query = real;
    tabs.push(tab({ id: 2, title: "Second" }));
    (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();

    await waitFor(() =>
      expect(titles(result.current)).toEqual(["First", "Second"]),
    );
  });

  // An event that changes nothing the app holds should cost nothing to
  // render. Without this every load published a new object and every
  // subscriber re-rendered, for every event Chrome sends.
  it("does not notify when the browser answers the same thing twice", async () => {
    installChrome({ windows: WINDOWS, tabs: [tab({ id: 1 })] });
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useTabsStructure();
    });
    await waitFor(() => expect(result.current).toBeDefined());

    const settled = renders;
    [1, 2, 3].forEach(() => {
      (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(renders).toBe(settled);
  });

  // A later subscriber is served by the snapshot that is already there.
  it("does not re-query for a subscriber that arrives late", async () => {
    installChrome({ windows: WINDOWS, tabs: [tab({ id: 1 })] });
    const first = renderHook(() => useTabsStructure());
    await waitFor(() => expect(first.result.current).toBeDefined());

    vi.mocked(chrome.tabs.query).mockClear();
    const second = renderHook(() => useTabsStructure());

    expect(second.result.current).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(chrome.tabs.query).not.toHaveBeenCalled();
  });
  it("stops listening once the last consumer goes", async () => {
    const { unmount, result } = renderHook(() => useTabsStructure());
    await waitFor(() => expect(result.current).toBeDefined());

    unmount();
    vi.mocked(chrome.tabs.query).mockClear();
    (chrome.tabs.onUpdated as unknown as { fire: () => void }).fire();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(chrome.tabs.query).not.toHaveBeenCalled();
  });
});
