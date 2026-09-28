import {
  Chip,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
} from "@mui/material";
import {
  ComponentProps,
  FC,
  MouseEventHandler,
  ReactNode,
  useCallback,
} from "react";

import { rowControlsSx, useRowKeys } from "../elements/rowControls.ts";
import { GroupItem } from "../types.ts";

export const GroupDisplay: FC<{
  group: GroupItem;
  pre?: ReactNode;
  itemAction?: ReactNode;
  sx?: ComponentProps<typeof ListItemButton>["sx"];
  onCtrlClick?: MouseEventHandler;
}> = ({ group, onCtrlClick, itemAction, pre, sx }) => {
  const rowKeys = useRowKeys();
  const handleClick = useCallback<MouseEventHandler>(
    async (e) => {
      if (e.ctrlKey || e.metaKey) {
        onCtrlClick && onCtrlClick(e);
      }
      await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
    },
    [group.collapsed, group.id, onCtrlClick],
  );

  return (
    <ListItemButton
      onClick={handleClick}
      onKeyDown={rowKeys}
      sx={[
        { pt: 0.2, pb: 0.2, height: 49.5 },
        {
          boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
        },
        rowControlsSx,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {pre}
      <ListItemSecondaryAction>
        <div className="itemAction">{itemAction}</div>
      </ListItemSecondaryAction>
      <ListItemText
        primary={
          <Chip
            label={group.title}
            size="small"
            // Chip's own `max-width: 100%` is the whole of this bug: the text
            // box runs to the row's right edge, and so, for a long enough
            // name, did the pill — under the drag handle, the menu and the
            // close button, rounded edge and tint included. Measured in the
            // harness at 400px: the controls span 88.3px, and ~8px more keeps
            // the pill off the handle's hover fill. A short name never
            // reaches this, which is why it went unnoticed.
            //
            // Reserved rather than masked, which is the one place this row
            // parts company with the tab row. `rowTailMaskSx` fades the whole
            // `.MuiListItemText-root`, and this one holds a filled pill: the
            // gradient would take the tint and the rounded edge with it and
            // leave the chip dissolving wherever the controls appear. Plain
            // text has nothing to dissolve, which is why it works there.
            //
            // Reserved always, then, rather than only while they show —
            // shrinking a pill on reveal would redraw the whole thing under
            // the pointer. The cost is a name that ellipsises 96px early even
            // at rest, which is exactly what the mask exists to avoid; a pill
            // is what makes it the better of the two.
            //
            // No controls, no reservation — the drag overlay renders this row
            // without any, and 96px of nothing would truncate the name it is
            // dragging for no reason.
            sx={{ maxWidth: itemAction ? "calc(100% - 96px)" : undefined }}
            style={{
              backgroundColor: `color-mix(in srgb, ${group.color} 30%, transparent`,
            }}
          />
        }
      />
    </ListItemButton>
  );
};
