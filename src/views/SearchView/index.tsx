import { Box, Typography } from "@mui/material";
import { FC, useCallback, useEffect, useMemo } from "react";

import { Tabs } from "../../lib/Tabs";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const SearchView: FC<{
  search: string;
  onMatches: (count: number) => void;
}> = ({ search, onMatches }) => {
  const filterTabs = useCallback(
    ({ title, url }: chrome.tabs.Tab): boolean =>
      Boolean(
        title?.toLowerCase().includes(search.toLowerCase()) ||
          url?.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const loaded = useTabsStructure({ filter: filterTabs });

  // Reported upward rather than announced here, because this component is
  // unmounted whenever the search box is empty — and a live region that
  // appears at the same moment its text does is not reliably announced. The
  // region lives in App, mounted for the life of the page.
  const matches = useMemo(
    () =>
      (loaded ?? []).reduce(
        (total, item) => total + (item.type === "group" ? item.tabs.length : 1),
        0,
      ),
    [loaded],
  );
  useEffect(() => {
    if (loaded) onMatches(matches);
  }, [loaded, matches, onMatches]);
  const tabsStructure = loaded ?? [];
  const windows = useWindowsStructure();

  // `loaded` guards the same gap TabsView had: until both reads resolve there
  // is no basis for saying nothing matched — neither an unqueried tab list
  // nor an unqueried window list is evidence of absence.
  if (loaded && windows && tabsStructure.length === 0) {
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
      {(windows ?? []).map((window) => (
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
