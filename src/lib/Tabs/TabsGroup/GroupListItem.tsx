import { GroupDisplay } from "./GroupDisplay.tsx";
import {
  ComponentProps,
  FC,
  MouseEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { Close, ExpandLess, ExpandMore, MoreVert } from "@mui/icons-material";
import { promptUndo } from "../../promptUndo.tsx";
import { TabListItem } from "../Tab/TabListItem.tsx";
import { TabGrid } from "../elements/TabGrid.tsx";
import { useDraggable } from "@dnd-kit/core";
import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { handleInnerDrop } from "./handleInnerDrop.ts";
import { handleDrop } from "./handleDrop.ts";

export const GroupListItem: FC<
  ComponentProps<typeof GroupDisplay> & { expanded?: boolean }
> = ({ group, expanded }) => {
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
    isDragging,
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
  } = useDraggable({
    id: group.id as number,
    data: group,
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
      promptUndo(`${tabIds.length} tabs are closed`);
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
        <IconButton
          onClick={handleOpenMenuClick}
          aria-label="delete"
          size="small"
        >
          <MoreVert />
        </IconButton>
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
        </Menu>
        <IconButton
          className="close-button"
          onClick={handleDelete}
          edge="end"
          aria-label="delete"
        >
          <Close />
        </IconButton>
      </>
    );
  }, [anchorEl, handleDelete, handleUngroup, open]);
  const pre = useMemo(() => {
    return (
      expanded === undefined && (
        <IconButton edge="start">
          {!group.collapsed ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      )
    );
  }, [expanded, group.collapsed]);
  return (
    <>
      {outerDZ.isOver && !outerDZ.isSelf ? <DropPlaceholder /> : null}
      {!isDragging && (
        <>
          <TabGrid
            sx={[
              {
                backgroundColor: `color-mix(in srgb, ${group.color} 15%, transparent)`,
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
            <div ref={setNodeRefDraggable} {...listeners} {...attributes}>
              <OuterDropzone>
                <GroupDisplay
                  group={group}
                  sx={[
                    open && {
                      [`& .itemAction`]: {
                        visibility: "visible",
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
    </>
  );
};
