import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Button,
  IconButton,
  ListItemButton,
  ListItemSecondaryAction,
} from "@mui/material";
import { ComponentProps, FC, MouseEventHandler, ReactNode } from "react";

import {
  ROW_CHEVRON_NAME,
  rowControlProps,
  rowControlsSx,
  rowPrimaryProps,
  useRowKeys,
} from "../elements/rowControls.ts";
import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
import { TabItem } from "../types.ts";

export const WindowDisplay: FC<{
  tabs: TabItem[];
  /** The toolbar's accessible name; see `toolbarName` in WindowListItem. */
  label: string;
  pre?: ReactNode;
  itemAction?: ReactNode;
  isOpen?: boolean;
  handleOpenClick: () => void;
  handleActivateClick: MouseEventHandler;
  sx?: ComponentProps<typeof ListItemButton>["sx"];
}> = ({
  handleActivateClick,
  label,
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
      // A toolbar, not a button: the row holds several controls, and a button
      // may not. ButtonBase sets role="button" on a non-button component but
      // spreads its own props after that default, so this wins — asserted in
      // WindowDisplay.test.tsx rather than trusted. tabIndex -1 because the row
      // is never the focus target: the chevron is its one Tab stop (SPEC-04
      // D-5), which is also what drops the row from `useRowKeys`'s stops (D-9).
      component="div"
      role="toolbar"
      tabIndex={-1}
      aria-label={label}
      // The pointer path is unchanged (AC-18): a click anywhere on the row
      // still expands and collapses.
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
      {/* The row's primary action, and so its one Tab stop (SPEC-04 D-5, AC-32,
          AC-33). It does what a click on the row body does, by being inside
          it: there is no `onClick` here, so a click, Enter or Space on the
          chevron reaches the row's own, once. A handler here had to stop the
          click and then call the same function. */}
      <IconButton
        edge="start"
        {...rowPrimaryProps}
        aria-label={ROW_CHEVRON_NAME}
        aria-expanded={!!isOpen}
      >
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
      {pre}
      <ListItemSecondaryAction>
        <div className="itemAction">{itemAction}</div>
      </ListItemSecondaryAction>
      {/* A `div` with `role="button"`, for the reason the tab row's primary
          is one: the avatars inside are `div`s, which HTML does not allow in a
          `<button>`. MUI sets the role and handles Enter and Space itself. */}
      <Button
        component="div"
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
