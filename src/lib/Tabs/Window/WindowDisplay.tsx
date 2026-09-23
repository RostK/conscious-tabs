import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Button,
  IconButton,
  ListItemButton,
  ListItemSecondaryAction,
} from "@mui/material";
import { ComponentProps, FC, MouseEventHandler, ReactNode } from "react";

import {
  rowControlProps,
  rowControlsSx,
  useRowKeys,
} from "../elements/rowControls.ts";
import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
import { TabItem } from "../types.ts";

export const WindowDisplay: FC<{
  tabs: TabItem[];
  pre?: ReactNode;
  itemAction?: ReactNode;
  isOpen?: boolean;
  handleOpenClick: () => void;
  handleActivateClick: MouseEventHandler<HTMLButtonElement>;
  sx?: ComponentProps<typeof ListItemButton>["sx"];
}> = ({
  handleActivateClick,
  tabs,
  isOpen,
  handleOpenClick,
  pre,
  itemAction,
  sx,
}) => {
  const rowKeys = useRowKeys();

  return (
    <ListItemButton
      onClick={handleOpenClick}
      onKeyDown={rowKeys}
      sx={[
        {
          height: 49.5,
          pl: "1.8rem",
        },
        rowControlsSx,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Purely an indicator: the row's own click is what expands and
          collapses, so this must not be a tab stop of its own — it would be an
          unlabelled one that does nothing on Enter. */}
      <IconButton edge="start" tabIndex={-1} aria-hidden>
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
      {pre}
      <ListItemSecondaryAction>
        <div className="itemAction">{itemAction}</div>
      </ListItemSecondaryAction>
      <Button
        onClick={handleActivateClick}
        {...rowControlProps}
        aria-label={`Switch to this window, ${tabs.length} tab${
          tabs.length === 1 ? "" : "s"
        }`}
      >
        <TabAvatarsDisplay tabsStructure={tabs} />
      </Button>
    </ListItemButton>
  );
};
