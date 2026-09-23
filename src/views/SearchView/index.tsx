import { Box, Typography } from "@mui/material";
import { FC, useCallback } from "react";

import { Tabs } from "../../lib/Tabs";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const SearchView: FC<{ search: string }> = ({ search }) => {
  const filterTabs = useCallback(
    ({ title, url }: chrome.tabs.Tab): boolean =>
      Boolean(
        title?.toLowerCase().includes(search.toLowerCase()) ||
          url?.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const loaded = useTabsStructure({ filter: filterTabs });
  const tabsStructure = loaded ?? [];
  const windows = useWindowsStructure();

  // `loaded` guards the same gap TabsView had: until the first query resolves
  // there is no basis for saying nothing matched.
  if (loaded && windows.length > 0 && tabsStructure.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No tabs match “{search}”.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {windows.map((window) => (
        <Tabs
          expandedGroups
          key={"w" + window.id}
          focus={false}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
        />
      ))}
    </>
  );
};
