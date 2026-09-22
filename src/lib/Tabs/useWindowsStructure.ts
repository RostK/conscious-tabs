import { useCallback, useState } from "react";

import { isBrowsingWindow } from "../surfaces.ts";
import { useUpdateEvents } from "../useUpdateEvents.ts";

export const useWindowsStructure = (): chrome.windows.Window[] => {
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);

  const getWindows = useCallback(async () => {
    // Browsing windows only. Our own float is reported by chrome.windows as
    // an ordinary `type: "normal"` window, so filtering on type does nothing:
    // it showed up in the list holding a single about:blank tab, called itself
    // focused (which auto-expanded it), and carried a close button that would
    // have destroyed the float. `alwaysOnTop` is what actually separates them.
    const windowsData = await chrome.windows.getAll({
      windowTypes: ["normal"],
    });
    setWindows(windowsData.filter(isBrowsingWindow));
  }, []);
  const getInitialData = useCallback(() => {
    void getWindows();
  }, [getWindows]);
  useUpdateEvents({ onWindowsUpdate: getWindows, init: getInitialData });
  return windows;
};
