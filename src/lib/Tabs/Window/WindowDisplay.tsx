import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Button,
  IconButton,
  ListItemButton,
  ListItemSecondaryAction,
} from "@mui/material";
import { ComponentProps, FC, MouseEventHandler, ReactNode } from "react";

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
  return (
    <ListItemButton
      onClick={handleOpenClick}
      sx={[
        {
          minHeight: 54.5,
          pl: "1.8rem",
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
      <IconButton edge="start">
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
      {pre}
      <ListItemSecondaryAction>
        <div className="itemAction">{itemAction}</div>
      </ListItemSecondaryAction>
      <Button onClick={handleActivateClick}>
        <TabAvatarsDisplay tabsStructure={tabs} />
      </Button>
    </ListItemButton>
  );
};
