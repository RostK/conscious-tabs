import { Button, debounce } from "@mui/material";
import { closeSnackbar, enqueueSnackbar, SnackbarKey } from "notistack";
import { FC, useEffect } from "react";

import { useKeepTabsLoaded, wasListedTab } from "../useTabsStructure.ts";
import { restoreSessions } from "./restore.ts";
import { shouldPrompt } from "./shouldPrompt.ts";

// chrome.sessions only retains the most recently closed entries.
const MAX_RESTORE = chrome.sessions.MAX_SESSION_RESULTS;

/**
 * How long a prompt stays on screen — and therefore how long a further closure
 * still counts as part of the same one. `PromptProvider` hands this to
 * notistack and the merge window below reuses it, so the two cannot drift.
 */
export const PROMPT_DURATION = 3000;

// A closed entry is either a single tab or a whole window of tabs.
const tabCountOf = (session: chrome.sessions.Session): number =>
  session.window ? session.window.tabs?.length ?? 1 : 1;

/**
 * The prompt currently on screen, and how many tabs it speaks for.
 *
 * Chrome fires `onRemoved` once per tab and the gaps between them are not
 * bounded: a page with a `beforeunload` handler, or a renderer that is merely
 * busy, can arrive hundreds of milliseconds after its neighbour. Closing nine
 * tabs with one click therefore split across the 200ms burst window and
 * produced two notices — "3 tabs closed", then "6 tabs closed" — the first of
 * which offered to undo a third of what the user had just done.
 *
 * Widening the burst window does not fix that. It only moves where the split
 * lands, and it delays the ordinary one-tab prompt to pay for it. So the split
 * is absorbed afterwards instead: while a prompt is still up, the next burst
 * rewrites it rather than queueing behind it, and the rewritten prompt counts
 * — and restores — every tab of the burst so far.
 *
 * The window is the prompt's own lifetime, which is a rule the user can see:
 * a closure joins the notice they can still press UNDO on. Hovering a snackbar
 * pauses its timer, so a hovered prompt can outlive this and the next burst
 * gets a notice of its own — which is the behaviour from before this merge
 * existed, and the right thing to fall back to.
 */
let liveCount = 0;
let liveId: SnackbarKey | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;

/** The prompt is spent: expired, undone, or its surface is going away. */
const forget = () => {
  if (expiry !== undefined) clearTimeout(expiry);
  expiry = undefined;
  liveCount = 0;
  liveId = undefined;
};

const prompt = async (closedCount: number) => {
  if (closedCount === 0) return;
  // Checked here rather than on the event: visibility can change during the
  // 200ms burst window, and what matters is where the user is when the
  // prompt would actually appear.
  if (!shouldPrompt()) return;
  const recentSessions = await chrome.sessions.getRecentlyClosed({
    maxResults: MAX_RESTORE,
  });
  if (recentSessions.length === 0) return;

  // Everything below this line runs synchronously, so two bursts cannot both
  // read the same starting total and one of them lose its tabs.
  const total = liveCount + closedCount;

  // Take the newest entries that cover this burst, counting tabs (not entries)
  // so a coalesced window session is credited for all of its tabs.
  const toRestore: chrome.sessions.Session[] = [];
  let restorable = 0;
  for (const session of recentSessions) {
    if (restorable >= total) break;
    toRestore.push(session);
    restorable += tabCountOf(session);
  }
  restorable = Math.min(restorable, total);

  const label =
    total === 1
      ? "Tab closed"
      : restorable < total
        ? `${total} tabs closed (${restorable} restorable)`
        : `${total} tabs closed`;

  // Replaced rather than stacked: with maxSnack=1 a second notice waits its
  // turn instead, and the user reads both halves of one closure in sequence.
  if (liveId !== undefined) closeSnackbar(liveId);
  liveId = enqueueSnackbar(label, {
    action: (snackbarId) => (
      <Button
        variant="text"
        color="secondary"
        onClick={async () => {
          try {
            await restoreSessions(toRestore);
          } catch {
            // A session id is spent once restored, so a second surface's UNDO
            // for the same burst will reject. Say so quietly rather than
            // leaving an unhandled rejection in the console.
            enqueueSnackbar("Couldn't restore those tabs", {
              variant: "error",
            });
          }
          // Spent either way. A later closure starts its own count rather than
          // offering these session ids a second time.
          forget();
          closeSnackbar(snackbarId);
        }}
      >
        UNDO
      </Button>
    ),
  });
  if (expiry !== undefined) clearTimeout(expiry);
  liveCount = total;
  expiry = setTimeout(forget, PROMPT_DURATION);
};

// chrome.tabs.onRemoved fires once per tab; accumulate a burst and prompt once.
let burstCount = 0;
const flush = debounce(() => {
  const count = burstCount;
  burstCount = 0;
  void prompt(count);
}, 200);
const handleRemove = (tabId: number) => {
  // Only tabs the manager was showing. The float's own window carries an
  // about:blank tab, so "Stop floating" otherwise announced a tab closure
  // the user never made — and offered to undo it.
  if (!wasListedTab(tabId)) return;
  burstCount += 1;
  flush();
};

export const SyncPrompt: FC = () => {
  // Keeps the snapshot wasListedTab reads alive, rather than relying on
  // some other component being mounted to do it.
  useKeepTabsLoaded();
  useEffect(() => {
    chrome.tabs.onRemoved.addListener(handleRemove);
    return () => {
      chrome.tabs.onRemoved.removeListener(handleRemove);
      // The burst belongs to this surface. Left running, it prompts from a
      // document the user has already left — and, in tests, from the case
      // after the one that started it. The same goes for the prompt it would
      // have merged into.
      burstCount = 0;
      flush.clear();
      forget();
    };
  }, []);
  return <></>;
};
