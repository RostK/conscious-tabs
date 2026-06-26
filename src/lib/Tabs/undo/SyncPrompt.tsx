import { Button, debounce } from "@mui/material";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { FC, useEffect } from "react";

// chrome.sessions only retains the most recently closed entries.
const MAX_RESTORE = chrome.sessions.MAX_SESSION_RESULTS;

// A closed entry is either a single tab or a whole window of tabs.
const tabCountOf = (session: chrome.sessions.Session): number =>
  session.window ? session.window.tabs?.length ?? 1 : 1;

const restore = async (sessions: chrome.sessions.Session[]) => {
  const focusedWindow = await chrome.windows.getLastFocused();
  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: focusedWindow.id,
  });

  // Oldest-first so restored tabs land back in roughly their original order.
  for (const session of [...sessions].reverse()) {
    const sessionId = session.tab?.sessionId ?? session.window?.sessionId;
    if (sessionId) {
      await chrome.sessions.restore(sessionId);
    }
  }

  // Restoring steals focus/activation; put the user back where they were.
  if (focusedWindow.id) {
    void chrome.windows.update(focusedWindow.id, { focused: true });
  }
  if (activeTab?.id) {
    void chrome.tabs.update(activeTab.id, { active: true });
  }
};

const prompt = async (closedCount: number) => {
  if (closedCount === 0) return;
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
          await restore(toRestore);
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
const handleRemove = () => {
  burstCount += 1;
  flush();
};

export const SyncPrompt: FC = () => {
  useEffect(() => {
    chrome.tabs.onRemoved.addListener(handleRemove);
    return () => {
      chrome.tabs.onRemoved.removeListener(handleRemove);
    };
  }, []);
  return <></>;
};
