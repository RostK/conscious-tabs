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
  rowPrimaryProps,
  useRowKeys,
} from "../elements/rowControls.ts";
import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
import { TabItem } from "../types.ts";

/**
 * The chevron's accessible name — SPEC-04 AC-6, AC-33.
 *
 * A PROPOSAL, awaiting a listen (PLAN-SPEC-04 T-2b, "Open for T-4/T-5"), and
 * the same word as the group row's chevron on purpose. It is stable: an APG
 * disclosure button keeps one name and lets `aria-expanded` speak, so a screen
 * reader says "Tabs, button, expanded" and "Tabs, button, collapsed". The
 * toolbar around it has already said which window, so this does not. Changing
 * the wording is this one line, plus its assertions in WindowDisplay.test.tsx.
 */
const CHEVRON_NAME = "Tabs";

export const WindowDisplay: FC<{
  tabs: TabItem[];
  /** The toolbar's accessible name; see `toolbarName` in WindowListItem. */
  label: string;
  pre?: ReactNode;
  itemAction?: ReactNode;
  isOpen?: boolean;
  handleOpenClick: () => void;
  handleActivateClick: MouseEventHandler<HTMLButtonElement>;
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
          AC-33). It does what a click on the row body does. The row keeps its
          own `onClick` for the pointer and the chevron sits inside it, so the
          click is stopped here or it would toggle twice and end where it
          started. There is no modifier click to let through: unlike the tab
          and group rows, a click on a window row never selects. */}
      <IconButton
        edge="start"
        {...rowPrimaryProps}
        aria-label={CHEVRON_NAME}
        aria-expanded={!!isOpen}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenClick();
        }}
      >
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
