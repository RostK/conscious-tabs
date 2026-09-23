import { useCallback, useState } from "react";

import { resolveUserWindow } from "../surfaces.ts";
import { useUpdateEvents } from "../useUpdateEvents.ts";

/**
 * The browser window the user is working in, kept current as they move.
 *
 * In the side panel this never changes — a panel belongs to one window for its
 * whole life. In the anchor tab and the float it has to follow the user, which
 * is the entire difference: those surfaces outlive any single window, so
 * "which window am I in" stops being a fact about the document and becomes a
 * question about the user.
 *
 * `onWindowsUpdate` covers `windows.onFocusChanged`, the event that matters
 * here; `onCreated` / `onRemoved` keep it honest when the window they were in
 * disappears.
 */
export const useUserWindow = (): number | undefined => {
  const [windowId, setWindowId] = useState<number>();

  const resolve = useCallback(() => {
    void resolveUserWindow().then(setWindowId);
  }, []);

  useUpdateEvents({ onWindowsUpdate: resolve, init: resolve });

  return windowId;
};
