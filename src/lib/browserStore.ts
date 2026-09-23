import { debounce } from "@mui/material";
import { useEffect, useSyncExternalStore } from "react";

/**
 * A piece of browser state that the whole app reads and nobody owns.
 *
 * Every hook that mirrored `chrome.*` used to do this by hand, once per
 * component: its own listeners, its own debounce, its own query. Four copies
 * of the tab list were mounted at once, so a single `chrome.tabs.onUpdated`
 * cost twelve extension round trips. The work is identical in all of them, so
 * it belongs in one place that they subscribe to.
 *
 * Four rules live here, each of which was a bug before it was a rule:
 *
 * 1. **A generation counter.** A load is several awaited round trips, so one
 *    started earlier can finish later; without this the older answer won by
 *    landing last, and a closed tab came back from the dead.
 * 2. **`undefined` until the first load resolves.** An initial empty value is
 *    a claim about the browser, and two views printed it — "No other tabs are
 *    open." on every open, for as long as the query took.
 * 3. **A failed read changes nothing.** Rejections happen while a window is
 *    closing or the extension is reloading; the last snapshot stands and the
 *    next event retries, rather than an unhandled rejection and a list that
 *    quietly stops matching.
 * 4. **Listeners live exactly as long as a subscriber.** Reaching zero drops
 *    the snapshot too, so the next subscriber starts cold rather than reading
 *    what the last one left behind.
 */
interface ChromeEvent {
  addListener: (callback: () => void) => void;
  removeListener: (callback: () => void) => void;
}

export interface BrowserStore<T> {
  /** For `useSyncExternalStore`. */
  subscribe: (notify: () => void) => () => void;
  /** The current value, or undefined before the first load resolves. */
  get: () => T | undefined;
  /** Subscribe without re-rendering: for asking questions, not showing them. */
  useAlive: () => void;
  /** Read it in a component, re-rendering when it changes. */
  useValue: () => T | undefined;
}

/**
 * `equals` decides what counts as a change. Without it every load publishes a
 * new object and every subscriber re-renders, including for the events that
 * carry nothing this app shows.
 */
export const createBrowserStore = <T>({
  load,
  events,
  equals = (a: T, b: T) => a === b,
  label,
}: {
  load: () => Promise<T>;
  events: () => ChromeEvent[];
  equals?: (a: T, b: T) => boolean;
  label: string;
}): BrowserStore<T> => {
  let snapshot: T | undefined;
  let generation = 0;
  let attached: ChromeEvent[] = [];
  const listeners = new Set<() => void>();
  let coldRetry: ReturnType<typeof setTimeout> | undefined;
  let coldAttempts = 0;

  const cancelColdRetry = () => {
    if (coldRetry !== undefined) clearTimeout(coldRetry);
    coldRetry = undefined;
    coldAttempts = 0;
  };

  /**
   * Ask again after a first load that failed with nothing to fall back on.
   *
   * Rule 3 leans on "the next event retries", which is sound only while there
   * is a snapshot to keep showing. A cold start that fails has none, and no
   * event is promised — a quiet browser sends nothing — so the view sits on
   * `undefined` indefinitely and draws neither a list nor its empty state.
   *
   * Bounded on purpose. The failures this covers are transient (a window
   * tearing down, the extension reloading) and clear in well under a second;
   * if the extension's context is gone instead, every attempt will fail for
   * as long as the page lives, and an unbounded loop would spend the rest of
   * that life writing to the console. Five doublings, then leave it to the
   * events.
   */
  const COLD_RETRY_LIMIT = 5;
  const scheduleColdRetry = () => {
    if (coldRetry !== undefined || coldAttempts >= COLD_RETRY_LIMIT) return;
    const wait = 200 * 2 ** coldAttempts;
    coldAttempts += 1;
    coldRetry = setTimeout(() => {
      coldRetry = undefined;
      if (snapshot === undefined && listeners.size > 0) void run();
    }, wait);
  };

  const run = async () => {
    const mine = ++generation;
    let next: T;
    try {
      next = await load();
    } catch (error) {
      console.error(`Couldn't read ${label}`, error);
      // Nothing to stand on, and nothing obliged to ask again: see above.
      if (mine === generation && snapshot === undefined && listeners.size > 0) {
        scheduleColdRetry();
      }
      return;
    }
    if (mine !== generation) return;
    if (snapshot !== undefined && equals(snapshot, next)) return;
    cancelColdRetry();
    snapshot = next;
    listeners.forEach((notify) => {
      notify();
    });
  };

  const refresh = debounce(() => {
    void run();
  }, 10);

  const subscribe = (notify: () => void): (() => void) => {
    if (listeners.size === 0) {
      // Captured once: reading them again at teardown would remove listeners
      // from whatever `chrome` is current by then, which is not necessarily
      // the object they were added to.
      attached = events();
      attached.forEach((event) => {
        event.addListener(refresh);
      });
    }
    listeners.add(notify);
    // Only when there is nothing to hand over: a later subscriber is served
    // synchronously by get(), and the listeners keep it current after that.
    if (snapshot === undefined) refresh();

    return () => {
      listeners.delete(notify);
      if (listeners.size > 0) return;
      attached.forEach((event) => {
        event.removeListener(refresh);
      });
      attached = [];
      refresh.clear();
      cancelColdRetry();
      generation += 1; // an answer in flight is nobody's now
      snapshot = undefined;
    };
  };

  const get = () => snapshot;

  return {
    subscribe,
    get,
    useAlive: () => {
      useEffect(() => subscribe(() => undefined), []);
    },
    useValue: () => useSyncExternalStore(subscribe, get),
  };
};

/**
 * Structural comparison for stores whose value is a plain array or object of
 * browser data. Deliberately not a hand-written field list: one forgotten
 * field there is a view that silently stops updating, and these payloads are
 * small enough that the cost is nothing beside the round trips they came from.
 */
export const sameData = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
