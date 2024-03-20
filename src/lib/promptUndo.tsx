import { ReactNode } from "react";
import { enqueueSnackbar } from "notistack";
import { Button } from "@mui/material";

export const promptUndo = (message: ReactNode): void => {
  enqueueSnackbar(message, {
    action: () => (
      <Button
        variant="text"
        color="secondary"
        onClick={async () => {
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
            recentSessionsIds.forEach((id) => {
              void chrome.sessions.restore(id);
            });
          }
        }}
      >
        UNDO
      </Button>
    ),
  });
};
