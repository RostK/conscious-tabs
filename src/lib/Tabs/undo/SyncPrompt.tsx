import { Button, debounce } from "@mui/material";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { FC, useEffect } from "react";

import { useKeepTabsLoaded, wasListedTab } from "../useTabsStructure.ts";
import { restoreSessions } from "./restore.ts";
import { shouldPrompt } from "./shouldPrompt.ts";

// chrome.sessions only retains the most recently closed entries.
const MAX_RESTORE = chrome.sessions.MAX_SESSION_RESULTS;

// A closed entry is either a single tab or a whole window of tabs.
const tabCountOf = (session: chrome.sessions.Session): number =>
  session.window ? session.window.tabs?.length ?? 1 : 1;

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

  // Take the newest entries that cover this burst, counting tabs (not entries)
  // so a coalesced window session is credited for all of its tabs.
  const toRestore: chrome.sessions.Session[] = [];
  let restorable = 0;
  for (const session of recentSessions) {
    if (restorable >= closedCount) break;
    toRestore.push(session);
    restorable += tabCountOf(session);
  }
  restorable = Math.min(restorable, closedCount);

  const label =
    closedCount === 1
      ? "Tab closed"
      : restorable < closedCount
        ? `${closedCount} tabs closed (${restorable} restorable)`
        : `${closedCount} tabs closed`;

  enqueueSnackbar(label, {
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
          closeSnackbar(snackbarId);
        }}
      >
        UNDO
      </Button>
    ),
  });
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
      // after the one that started it.
      burstCount = 0;
      flush.clear();
    };
  }, []);
  return <></>;
};
