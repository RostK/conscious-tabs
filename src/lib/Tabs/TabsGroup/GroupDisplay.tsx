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

import { GroupItem } from "../types.ts";

export const GroupDisplay: FC<{
  group: GroupItem;
  pre?: ReactNode;
  itemAction?: ReactNode;
  sx?: ComponentProps<typeof ListItemButton>["sx"];
  onCtrlClick?: MouseEventHandler;
}> = ({ group, onCtrlClick, itemAction, pre, sx }) => {
  const handleClick = useCallback<MouseEventHandler>(
    async (e) => {
      if (e.ctrlKey) {
        onCtrlClick && onCtrlClick(e);
      }
      await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
    },
    [group.collapsed, group.id, onCtrlClick],
  );

  return (
    <ListItemButton
      onClick={handleClick}
      divider
      sx={[
        { pt: 0.1, pb: 0.1, height: 48.46 },
        {
          boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
        },
        {
          [`&:hover .itemAction`]: {
            visibility: "visible",
          },
          [`& .itemAction`]: {
            visibility: "hidden",
          },
        },
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
            style={{
              backgroundColor: `color-mix(in srgb, ${group.color} 30%, transparent`,
            }}
          />
        }
      />
    </ListItemButton>
  );
};
