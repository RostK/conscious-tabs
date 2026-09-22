import { Box, Typography } from "@mui/material";
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

  // AC-18. Reachable in ordinary use once this extension's own pages are
  // filtered out: close everything but the anchor tab and there is genuinely
  // nothing left to mirror. The float must say so rather than go blank.
  //
  // Gated on `allWindows` having loaded, not on `windows` being empty, so the
  // first paint before the first query resolves does not flash this.
  if (allWindows.length > 0 && windows.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No other tabs are open.
        </Typography>
        <Typography variant="caption" color="text.disabled" component="div">
          Anything you open will show up here.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {windows.map((window) => (
        <WindowListItem
          // Stable across focus changes on purpose. Keying on window.focused
          // remounted the whole subtree every time the user switched windows —
          // and in the float every tab click does exactly that, so the rows
          // were destroyed and rebuilt under the pointer, taking the
          // hover-revealed close and select controls with them. Syncing isOpen
          // from window.focused is WindowListItem's own useEffect's job.
          key={"w" + window.id}
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
