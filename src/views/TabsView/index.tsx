import { Box, Typography } from "@mui/material";
import { FC, useState } from "react";

import { WindowListItem } from "../../lib/Tabs";
import { RowList } from "../../lib/Tabs/elements/RowList.tsx";
import { useTabsStructure } from "../../lib/Tabs/useTabsStructure.ts";
import { useWindowsStructure } from "../../lib/Tabs/useWindowsStructure.ts";

export const TabsView: FC = () => {
  const loaded = useTabsStructure();
  const tabsStructure = loaded ?? [];
  const allWindows = useWindowsStructure();

  // A window whose only tab was ours now has nothing to show. Rendering it
  // anyway leaves a header for a window the list claims is empty.
  const windows = (allWindows ?? []).filter((window) =>
    tabsStructure.some(({ windowId }) => windowId === window.id),
  );

  // The window the user last browsed in, kept while focus is somewhere else.
  // Reading `window.focused` straight collapsed every window the moment focus
  // left them all — and the click that leaves them is a click on this list:
  // on the float, which is a window of its own, or on the panel while Chrome
  // was in the background. The section shut ~20ms into the press, the row
  // went with it, and the release landed on whatever slid up underneath, so
  // the tab never switched. Only a browsing window taking focus moves this.
  const focusedId = allWindows?.find(({ focused }) => focused)?.id;
  const [currentId, setCurrentId] = useState(focusedId);
  if (focusedId !== undefined && focusedId !== currentId) {
    setCurrentId(focusedId);
  }

  // AC-18. Reachable in ordinary use once this extension's own pages are
  // filtered out: close everything but the anchor tab and there is genuinely
  // nothing left to mirror. The float must say so rather than go blank.
  //
  // Gated on both reads having resolved, not on `windows` being empty. The
  // windows arrive first — one call against three plus a debounce — so gating
  // on them alone announced an empty browser on every open, for as long as the
  // tabs took to follow.
  //
  // `allWindows &&` is the whole of that test now. It used to read
  // `.length > 0`, which also swallowed the real case of a user with no
  // browsing window at all — rare, but then the message is exactly right.
  if (loaded && allWindows && windows.length === 0) {
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

  // Nothing to put in a list yet: the reads have not both landed, so `windows`
  // is empty for want of looking, not for want of tabs. An empty `RowList`
  // would announce a list of zero (SPEC-04 E-4); before it existed the view
  // rendered nothing here, and still does.
  if (windows.length === 0) return null;

  return (
    <RowList>
      {windows.map((window, index) => (
        <WindowListItem
          // Stable across focus changes on purpose. Keying on window.focused
          // remounted the whole subtree every time the user switched windows —
          // and in the float every tab click does exactly that, so the rows
          // were destroyed and rebuilt under the pointer, taking the
          // hover-revealed close and select controls with them. Syncing isOpen
          // from `current` is WindowListItem's own useEffect's job.
          key={"w" + window.id}
          window={window}
          current={window.id === currentId}
          tabsStructure={tabsStructure.filter(
            ({ windowId }) => window.id === windowId,
          )}
          single={windows.length === 1}
          // Of the rendered windows, not `allWindows`: the ones with nothing to
          // show are filtered out above, and counting them would skip a number.
          index={index}
        />
      ))}
    </RowList>
  );
};
