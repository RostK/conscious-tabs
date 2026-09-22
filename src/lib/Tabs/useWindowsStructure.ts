import { useCallback, useState } from "react";

import { useUpdateEvents } from "../useUpdateEvents.ts";

export const useWindowsStructure = (): chrome.windows.Window[] => {
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);

  const getWindows = useCallback(async () => {
    // Normal browsing windows only. getAll() defaults to ["normal", "popup"],
    // and a Document Picture-in-Picture window is reported as one of those —
    // so our own float showed up in the list as a window holding a single
    // about:blank tab, reported itself as focused (which auto-expanded it),
    // and offered a close button that would have destroyed the float.
    const windowsData = await chrome.windows.getAll({
      windowTypes: ["normal"],
    });
    setWindows(windowsData);
  }, []);
  const getInitialData = useCallback(() => {
    void getWindows();
  }, [getWindows]);
  useUpdateEvents({ onWindowsUpdate: getWindows, init: getInitialData });
  return windows;
};
