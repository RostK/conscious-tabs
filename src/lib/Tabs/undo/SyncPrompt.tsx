import { Button, debounce } from "@mui/material";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { FC, useEffect } from "react";

const getMostRecentSessions = async () => {
  const recentSessions = await chrome.sessions.getRecentlyClosed();
  if (!recentSessions[0]) return [];
  const recentTimestamp = recentSessions[0].lastModified;
  return recentSessions.filter(
    ({ lastModified }) => recentTimestamp == lastModified,
  );
};

const prompt = async () => {
  const recentSessions = await getMostRecentSessions();
  if (recentSessions.length > 0) {
    const count = !recentSessions[0].window
      ? recentSessions.length
      : recentSessions[0].window.tabs?.length;

    enqueueSnackbar(count === 1 ? "Tab closed" : `${count} tabs closed`, {
      action: (snackbarId) => (
        <Button
          variant="text"
          color="secondary"
          onClick={async () => {
            const focusedWindow = await chrome.windows.getLastFocused();
            const [activeTab] = await chrome.tabs.query({
              active: true,
              windowId: focusedWindow.id,
            });

            await Promise.all(
              recentSessions.map((session) => {
                if (session.tab && session.tab.sessionId) {
                  return chrome.sessions.restore(session.tab.sessionId);
                }
                if (session.window && session.window.sessionId) {
                  return chrome.sessions.restore(session.window.sessionId);
                }
              }),
            );
            if (focusedWindow.id) {
              void chrome.windows.update(focusedWindow.id, { focused: true });
            }
            if (activeTab.id) {
              void chrome.tabs.update(activeTab.id, { active: true });
            }

            closeSnackbar(snackbarId);
          }}
        >
          UNDO
        </Button>
      ),
    });
  }
};
const handleRemove = debounce(prompt, 200);
export const SyncPrompt: FC = () => {
  useEffect(() => {
    chrome.tabs.onRemoved.addListener(handleRemove);
    return () => {
      chrome.tabs.onRemoved.removeListener(handleRemove);
    };
  }, []);
  return <></>;
};
