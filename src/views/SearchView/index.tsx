import { FC, useCallback } from "react";

import { Tabs } from "../../lib/Tabs";
import { SelectionToolbar } from "../../lib/Tabs/selection";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const SearchView: FC<{ search: string }> = ({ search }) => {
  const filterTabs = useCallback(
    ({ title, url }: chrome.tabs.Tab): boolean =>
      Boolean(title?.includes(search) || url?.includes(search)),
    [search],
  );

  const tabsStructure = useTabsStructure({ filter: filterTabs });
  const windows = useWindowsStructure();

  return (
    <>
      {windows.map((window) => (
        <Tabs
          expandedGroups
          key={"w" + window.id + window.focused}
          focus={false}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
        />
      ))}
      <SelectionToolbar />
    </>
  );
};
