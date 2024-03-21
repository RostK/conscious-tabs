import { ReactNode } from "react";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { Button } from "@mui/material";

export const promptUndo = (message: ReactNode): void => {
  enqueueSnackbar(message, {
    action: (snackbarId) => (
      <Button
        variant="text"
        color="secondary"
        onClick={async () => {
          const focusedWindow = await chrome.windows.getLastFocused();
          const recentSessions = await chrome.sessions.getRecentlyClosed();
          const recentSessionsIds: string[] = [];
          let recentTimestamp = 0;

          for (const session of recentSessions) {
            if (recentTimestamp === 0) {
              recentTimestamp = session.lastModified;
            }
            if (session.lastModified < recentTimestamp) {
              break;
            } else {
              if (session.tab && session.tab.sessionId) {
                recentSessionsIds.push(session.tab.sessionId);
              }
              if (session.window && session.window.sessionId) {
                recentSessionsIds.push(session.window.sessionId);
              }
            }
          }
          if (recentSessionsIds.length) {
            await Promise.all(
              recentSessionsIds.map((id) => {
                void chrome.sessions.restore(id);
              }),
            );
            if (focusedWindow.id) {
              void chrome.windows.update(focusedWindow.id, { focused: true });
            }
          }
          closeSnackbar(snackbarId);
        }}
      >
        UNDO
      </Button>
    ),
  });
};
