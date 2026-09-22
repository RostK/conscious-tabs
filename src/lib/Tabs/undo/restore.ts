import { resolveUserWindow } from "../../surfaces.ts";

/**
 * Put back recently-closed tabs, then put the user back where they were.
 *
 * That second half is the delicate part. `chrome.sessions.restore()` steals
 * focus and activation, so the user has to be returned deliberately — and
 * "where they were" must mean *their* window.
 *
 * This opened with `chrome.windows.getLastFocused()`, which from the float or
 * the anchor tab can resolve to the extension's own page. Pressing UNDO would
 * then hand the user their tab back and simultaneously throw them onto our
 * tab manager, which is a strange reward for undoing a tab close. Same defect
 * as the one SPEC-01 records for `useActiveTab`, in a file its cross-module
 * table does not list.
 */
export const restoreSessions = async (
  sessions: chrome.sessions.Session[],
): Promise<void> => {
  const windowId = await resolveUserWindow();
  const [activeTab] =
    windowId === undefined
      ? []
      : await chrome.tabs.query({ active: true, windowId });

  // Oldest-first so restored tabs land back in roughly their original order.
  for (const session of [...sessions].reverse()) {
    const sessionId = session.tab?.sessionId ?? session.window?.sessionId;
    if (sessionId) {
      await chrome.sessions.restore(sessionId);
    }
  }

  if (windowId !== undefined) {
    void chrome.windows.update(windowId, { focused: true });
  }
  if (activeTab?.id !== undefined) {
    void chrome.tabs.update(activeTab.id, { active: true });
  }
};
