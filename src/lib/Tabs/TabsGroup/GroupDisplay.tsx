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
      sx={[
        { pt: 0.2, pb: 0.2, height: 49.5 },
        {
          boxShadow: `inset 0.3rem 0px 0px 0px color-mix(in srgb, ${group.color} 60%, transparent)`,
        },
        {
          // See TabDisplay: keyboard focus never fires :hover, so these
          // controls were invisible and therefore unfocusable.
          [`&:hover .itemAction, &:focus-within .itemAction`]: {
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
