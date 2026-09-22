import { FC } from "react";

import { WindowListItem } from "../../lib/Tabs";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const TabsView: FC = () => {
  const tabsStructure = useTabsStructure();
  const allWindows = useWindowsStructure();

  // A window whose only tab was ours now has nothing to show. Rendering it
  // anyway leaves a header for a window the list claims is empty.
  const windows = allWindows.filter((window) =>
    tabsStructure.some(({ windowId }) => windowId === window.id),
  );

  return (
    <>
      {windows.map((window) => (
        <WindowListItem
          key={"w" + window.id + window.focused}
          window={window}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
          single={windows.length === 1}
        />
      ))}
    </>
  );
};
