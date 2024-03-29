import { useCallback, useState } from "react";

import { useUpdateEvents } from "../useUpdateEvents.ts";

export const useWindowsStructure = (): chrome.windows.Window[] => {
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);

  const getWindows = useCallback(async () => {
    const windowsData = await chrome.windows.getAll();
    setWindows(windowsData);
  }, []);
  const getInitialData = useCallback(() => {
    void getWindows();
  }, [getWindows]);
  useUpdateEvents({ onWindowsUpdate: getWindows, init: getInitialData });
  return windows;
};
