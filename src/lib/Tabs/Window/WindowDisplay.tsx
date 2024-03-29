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
  itemAction,
  sx,
}) => {
  return (
    <ListItemButton
      onClick={handleOpenClick}
      sx={[
        {
          minHeight: 54.5,
        },
        {
          [`&:hover .itemAction`]: {
            visibility: "visible",
          },
          [`& .itemAction`]: {
            visibility: "hidden",
          },
          [`& .itemAction .close-button`]: {
            bgcolor: `color-mix(in srgb, white 80%, transparent)`,
            ["&: hover"]: { bgcolor: "rgb(199, 199, 199)" },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <IconButton edge="start">
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
      <ListItemSecondaryAction>
        <div className="itemAction">{itemAction}</div>
      </ListItemSecondaryAction>
      <Button onClick={handleActivateClick}>
        <TabAvatarsDisplay tabsStructure={tabs} />
      </Button>
    </ListItemButton>
  );
};
