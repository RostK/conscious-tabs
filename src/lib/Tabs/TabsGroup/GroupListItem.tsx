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
import { rowControlProps, selectedProps } from "../elements/rowControls.ts";
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

  const outerDZ = useDropzone({
    id: group.id as number,
    type: "group",
    data: group,
    onDrop: handleDrop,
  });
  const OuterDropzone = outerDZ.Dropzone;
  const innerDZ = useDropzone({
    id: group.id as number,
    type: "group-inner",
    data: group,
    onDrop: handleInnerDrop,
  });
  const InnerDropzone = innerDZ.Dropzone;

  const {
    over,
    isDragging,
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
    setActivatorNodeRef,
  } = useDraggable({
    id: group.id as number,
    data: group,
  });

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

  const itemAction = useMemo(() => {
    return (
      <>
        <DragHandle
          label={`Reorder group ${group.title || ""}`.trim()}
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          onKeyDown={onKeyDown}
        />
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
          edge="end"
          {...rowControlProps}
          aria-label={`Close every tab in group ${group.title || ""}`.trim()}
        >
          <Close />
        </ItemButton>
      </>
    );
  }, [handleDelete, group.title, setActivatorNodeRef, attributes, onKeyDown]);

  const isSelected = useMemo(
    () => !group.tabs.find(({ id }) => id && !selected.includes(id)),
    [group.tabs, selected],
  );
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

  const pre = useMemo(() => {
    return (
      <>
        {expanded === undefined && (
          // Indicator only — the row's click collapses the group.
          <IconButton tabIndex={-1} aria-hidden>
            {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        <ItemButton
          {...rowControlProps}
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
  }, [expanded, group.collapsed, group.title, handleSelectButton, isSelected]);
  return (
    <>
      {outerDZ.isOver && !outerDZ.isSelf ? <DropPlaceholder /> : null}
      {(!isDragging || !over) && (
        <>
          <TabGrid
            sx={[
              {
                backgroundColor: `color-mix(in srgb, ${group.color} 8%, transparent)`,
                position: "relative",
              },
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
            <div ref={setNodeRefDraggable} onMouseDown={onMouseDown}>
              <OuterDropzone>
                <GroupDisplay
                  onCtrlClick={handleSelectButton}
                  group={group}
                  sx={[
                    // Hold the controls open while this row's own menu is,
                    // so the menu is not left anchored to something that has
                    // faded out. It has to set the property the shared model
                    // actually hides with: this said `visibility: visible`,
                    // which stopped meaning anything when rows moved to
                    // opacity, and had been quietly doing nothing since.
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
        </>
      )}
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
