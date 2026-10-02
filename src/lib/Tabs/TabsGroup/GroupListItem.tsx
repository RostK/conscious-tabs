import { useDraggable } from "@dnd-kit/core";
import {
  CheckBoxOutlineBlankOutlined,
  CheckBoxOutlined,
  Close,
  ExpandLess,
  ExpandMore,
  MoreVert,
} from "@mui/icons-material";
import { IconButton, Menu, MenuItem } from "@mui/material";
import {
  ComponentProps,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { DropPlaceholder, useDropzone } from "../DnD";
import { DragHandle } from "../elements/DragHandle.tsx";
import { ItemButton } from "../elements/ItemButton.tsx";
import {
  dragFocusKey,
  ROW_CHEVRON_NAME,
  rowControlProps,
  rowPrimaryProps,
  rowWhileDraggedSx,
  selectedProps,
} from "../elements/rowControls.ts";
import { TabGrid } from "../elements/TabGrid.tsx";
import { SelectionContext } from "../selection";
import { GroupForm } from "../selection/GroupForm.tsx";
import { TabListItem } from "../Tab/TabListItem.tsx";
import { GroupDisplay } from "./GroupDisplay.tsx";
import { handleDrop } from "./handleDrop.ts";
import { handleInnerDrop } from "./handleInnerDrop.ts";

export const GroupListItem: FC<
  ComponentProps<typeof GroupDisplay> & { expanded?: boolean }
> = ({ group, expanded }) => {
  const { selected, dispatch } = useContext(SelectionContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const handleCloseGroupDialog = useCallback(() => {
    setGroupDialogOpen(false);
  }, []);
  const handleOpenGroupDialog = useCallback(() => {
    setAnchorEl(null);
    setGroupDialogOpen(true);
  }, []);
  const handleUpdateGroup = useCallback(
    async ({ title, color }: { title?: string; color: string }) => {
      try {
        await chrome.tabGroups.update(group.id, {
          title: title,
          color: color as chrome.tabGroups.ColorEnum,
        });
      } catch (e) {
        /* empty */
      }
    },
    [group],
  );

  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
    setActivatorNodeRef,
  } = useDraggable({
    id: group.id as number,
    data: group,
  });

  // A group cannot be dropped on itself. Its row stays mounted while it is
  // dragged (see `rowWhileDraggedSx`), so its zones are switched off instead.
  const outerDZ = useDropzone({
    id: group.id as number,
    type: "group",
    data: group,
    onDrop: handleDrop,
    disabled: isDragging,
  });
  const OuterDropzone = outerDZ.Dropzone;
  const innerDZ = useDropzone({
    id: group.id as number,
    type: "group-inner",
    data: group,
    onDrop: handleInnerDrop,
    disabled: isDragging,
  });
  const InnerDropzone = innerDZ.Dropzone;

  // See DragHandle: the mouse half stays on the row, the keyboard half moves
  // to a named control, so a group row is one tab stop rather than two.
  const onMouseDown = listeners?.onMouseDown as
    | MouseEventHandler<HTMLDivElement>
    | undefined;
  const onKeyDown = listeners?.onKeyDown as KeyboardEventHandler | undefined;

  const handleOpenMenuClick: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleDelete = useCallback<MouseEventHandler>(async () => {
    const tabIds = group.tabs
      .map((tab) => tab.id)
      .filter((id) => id !== undefined) as number[];
    try {
      await chrome.tabs.remove(tabIds);
    } catch (e) {
      /* empty */
    }
  }, [group]);
  const handleUngroup = useCallback<MouseEventHandler>(async () => {
    const tabIds = group.tabs
      .map((tab) => tab.id)
      .filter((id) => id !== undefined) as number[];
    try {
      await chrome.tabs.ungroup(tabIds);
    } catch (e) {
      /* empty */
    }
    handleMenuClose();
  }, [group]);

  // Menu, close, then the handle last — the one control whose operation needs
  // the arrow-key pair goes at the end of the toolbar (SPEC-04 AC-30). It also
  // carries `edge="end"`, the negative margin on whatever sits flush with the
  // row's right edge, which moved here from Close: the same three buttons keep
  // the same -12px, so the chip's reservation in GroupDisplay is unchanged.
  const itemAction = useMemo(() => {
    return (
      <>
        <IconButton
          onClick={handleOpenMenuClick}
          {...rowControlProps}
          aria-label={`Actions for group ${group.title || ""}`.trim()}
          size="small"
        >
          <MoreVert />
        </IconButton>
        <ItemButton
          className="close-button"
          onClick={handleDelete}
          {...rowControlProps}
          aria-label={`Close every tab in group ${group.title || ""}`.trim()}
        >
          <Close />
        </ItemButton>
        <DragHandle
          edge="end"
          label={`Reorder group ${group.title || ""}`.trim()}
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          onKeyDown={onKeyDown}
          focusKey={dragFocusKey("group", group.id)}
        />
      </>
    );
  }, [
    handleDelete,
    group.title,
    group.id,
    setActivatorNodeRef,
    attributes,
    onKeyDown,
  ]);

  // Through a Set, for the same reason as the window row: `includes` is a scan
  // and this runs it once per tab in the group, per render.
  const isSelected = useMemo(() => {
    const chosen = new Set(selected);
    return !group.tabs.find(({ id }) => id && !chosen.has(id));
  }, [group.tabs, selected]);
  const handleSelectButton = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      isSelected
        ? dispatch({
            type: "deselect",
            data: group.tabs.map((tab) => tab.id as number),
          })
        : dispatch({
            type: "select",
            data: group.tabs.map((tab) => tab.id as number),
          });
    },
    [dispatch, group.tabs, isSelected],
  );

  // What the row's own click does in the tab list, for the keyboard. The row
  // keeps its `onClick` for the pointer, and the chevron sits inside it, so the
  // click is stopped here or it would toggle twice and end where it started.
  //
  // A modifier click is not stopped: it is the row's gesture for selecting
  // (AC-18), and the row has a branch for it that returns before collapsing.
  // Handling it here would either collapse on a Ctrl-click or copy that branch.
  //
  // No `collapsible` guard, unlike the row: the chevron is only rendered where
  // the row collapses (`expanded === undefined`), so it cannot be reached in a
  // surface that forces groups open.
  const handleToggle = useCallback<MouseEventHandler>(
    async (e) => {
      if (e.ctrlKey || e.metaKey) return;
      e.stopPropagation();
      try {
        await chrome.tabGroups.update(group.id, {
          collapsed: !group.collapsed,
        });
      } catch (e) {
        // The group can be gone by the time this lands; nothing to undo.
        console.error(e);
      }
    },
    [group.collapsed, group.id],
  );

  const pre = useMemo(() => {
    return (
      <>
        {expanded === undefined && (
          // The row's primary action, and so its one Tab stop (SPEC-04 D-5,
          // AC-32, AC-33). Not inside `.itemAction`, so it is never one of the
          // controls the row hides at rest.
          <IconButton
            {...rowPrimaryProps}
            aria-label={ROW_CHEVRON_NAME}
            aria-expanded={!group.collapsed}
            onClick={handleToggle}
          >
            {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        <ItemButton
          // Where there is no chevron — search results, D-8 — select-all is the
          // toolbar's first control and takes the stop, or the row would have
          // none. Everywhere else the chevron has it and this is reached by
          // Left/Right.
          {...(expanded === undefined ? rowControlProps : rowPrimaryProps)}
          aria-label={
            isSelected
              ? `Deselect every tab in group ${group.title || ""}`.trim()
              : `Select every tab in group ${group.title || ""}`.trim()
          }
          onClick={handleSelectButton}
          className="itemAction"
          {...selectedProps(isSelected)}
        >
          {isSelected ? <CheckBoxOutlined /> : <CheckBoxOutlineBlankOutlined />}
        </ItemButton>
      </>
    );
  }, [
    expanded,
    group.collapsed,
    group.title,
    handleSelectButton,
    handleToggle,
    isSelected,
  ]);
  return (
    <>
      {outerDZ.isOver && !outerDZ.isSelf ? <DropPlaceholder /> : null}
      {/* Mounted for the whole drag, collapsed while this group is the one
          being dragged: the handle inside it is what holds keyboard focus.
          It used to unmount once the drag was over anything, which in a
          browser is at once, since a drag starts over its own row. */}
      <TabGrid
        sx={[
          {
            backgroundColor: `color-mix(in srgb, ${group.color} 8%, transparent)`,
            position: "relative",
          },
          isDragging && rowWhileDraggedSx,
        ]}
      >
        {innerDZ.active?.data.current?.type !== "group" && (
          <InnerDropzone
            sx={{
              position: "absolute",
              width: "100%",
              height: "50%",
              top: "50%",
            }}
          />
        )}
        {/* Pointer only, on purpose: the accessible control for this is
                DragHandle, which carries the role, the tab stop and the
                keyboard half. Giving this div its own role would announce a
                second control for the same action. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div ref={setNodeRefDraggable} onMouseDown={onMouseDown}>
          <OuterDropzone>
            <GroupDisplay
              onCtrlClick={handleSelectButton}
              group={group}
              // The same condition the chevron is gated on: a surface that
              // forces groups open has no collapse to offer, and offering
              // it anyway changed the browser silently.
              collapsible={expanded === undefined}
              sx={[
                // Hold the controls open while this row's own menu is,
                // so the menu is not left anchored to something that has
                // faded out. It has to set the property the shared model
                // actually hides with: this said `visibility: visible`,
                // which stopped meaning anything when rows moved to
                // opacity, and had been quietly doing nothing since.
                //
                // The Menu is a portal, so focus is outside this toolbar
                // while it is open (SPEC-04 E-15). Nothing here keeps or
                // restores a position across that, on purpose: the row's
                // Tab stop is fixed (D-5), so there is no roving state to
                // lose, and AC-36 forbids remembering one.
                open && {
                  [`& .itemAction`]: {
                    opacity: 1,
                    pointerEvents: "auto",
                  },
                },
                Boolean(innerDZ.active?.data.current) && {
                  pointerEvents: "none",
                },
              ]}
              itemAction={itemAction}
              pre={pre}
            />
          </OuterDropzone>
        </div>
      </TabGrid>
      {innerDZ.isOver && !innerDZ.isSelf ? (
        <DropPlaceholder
          sx={{
            backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent)`,
          }}
        />
      ) : null}
      {!isDragging &&
        (!group.collapsed || expanded) &&
        group.tabs.map((tab) => (
          <TabListItem group={group} tab={tab} key={tab.id} />
        ))}

      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        sx={{ padding: 0 }}
      >
        <MenuItem dense onClick={handleUngroup}>
          Ungroup all tabs
        </MenuItem>
        <MenuItem dense onClick={handleOpenGroupDialog}>
          Change group
        </MenuItem>
      </Menu>
      <GroupForm
        onClose={handleCloseGroupDialog}
        open={groupDialogOpen}
        group={group}
        handleSave={handleUpdateGroup}
      />
    </>
  );
};
