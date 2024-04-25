import { useDraggable } from "@dnd-kit/core";
import {
  CancelOutlined,
  DeselectOutlined,
  DragIndicator,
  FolderOpen,
  OpenInBrowser,
} from "@mui/icons-material";
import { Box, Button, Grid, IconButton, Toolbar } from "@mui/material";
import {
  FC,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
import { TabItem } from "../types.ts";
import { promptUndo } from "../undo";
import { useTabsStructure } from "../useTabsStructure.ts";
import { GroupForm } from "./GroupForm.tsx";
import { SelectionContext } from "./SelectionContext.tsx";

export const SelectionToolbar: FC = () => {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const handleCloseGroupDialog = useCallback(() => {
    setGroupDialogOpen(false);
  }, []);
  const handleOpenGroupDialog = useCallback(() => {
    setGroupDialogOpen(true);
  }, []);

  const { selected, dispatch } = useContext(SelectionContext);
  const filter = useCallback(
    ({ id }: { id?: number }) => Boolean(id && selected.includes(id)),
    [selected],
  );
  const tabsStructure = useTabsStructure({
    filter,
  });

  const flatTabs = useMemo(() => {
    return tabsStructure
      .reduce((acc, item) => {
        return item.type === "group" ? [...acc, ...item.tabs] : [...acc, item];
      }, [] as TabItem[])
      .sort(
        (a, b) =>
          selected.indexOf(a.id as number) - selected.indexOf(b.id as number),
      );
  }, [selected, tabsStructure]);

  const {
    attributes,
    listeners,
    setNodeRef: setNodeRefDraggable,
  } = useDraggable({
    id: `sel${selected.join("|")}`,
    data: flatTabs,
  });

  const handleClear = useCallback(() => {
    dispatch({ type: "clear" });
  }, [dispatch]);

  const handleClose = useCallback<MouseEventHandler>(async () => {
    try {
      await chrome.tabs.remove(selected);
      promptUndo(`${selected.length} tabs are closed`);
      dispatch({ type: "clear" });
    } catch (e) {
      /* empty */
    }
  }, [dispatch, selected]);
  const handleNewGroup = useCallback(
    async ({ title, color }: { title?: string; color: string }) => {
      try {
        const newTabId = await chrome.tabs.group({ tabIds: selected });
        await chrome.tabGroups.update(newTabId, {
          title: title,
          color: color as chrome.tabGroups.ColorEnum,
        });
        dispatch({ type: "clear" });
      } catch (e) {
        /* empty */
      }
    },
    [dispatch, selected],
  );
  const handleNewWindow = useCallback(async () => {
    try {
      const { id } = await chrome.windows.create({
        focused: true,
        tabId: selected[0],
      });
      if (id) {
        await chrome.tabs.move(selected, { index: 0, windowId: id });
        await chrome.sidePanel.open({ windowId: id });
      }
      dispatch({ type: "clear" });
    } catch (e) {
      /* empty */
    }
  }, [dispatch, selected]);

  return selected.length ? (
    <>
      <Toolbar>
        <Grid spacing={0} sx={{ width: "100%" }} container>
          <Grid xs={0} sm={3} md={4} sx={[{ width: "100%" }]}>
            <></>
          </Grid>
          <Grid xs={12} sm={6} md={4} sx={[{ width: "100%" }]}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                cursor: "grab",
                p: "0.3rem 0 0 0",
              }}
              ref={setNodeRefDraggable}
              {...listeners}
              {...attributes}
            >
              <IconButton size="small">
                <DragIndicator />
              </IconButton>
              <TabAvatarsDisplay tabsStructure={flatTabs} />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Button startIcon={<DeselectOutlined />} onClick={handleClear}>
                Deselect
              </Button>
              <Button
                size="small"
                startIcon={<FolderOpen />}
                onClick={handleOpenGroupDialog}
              >
                Group
              </Button>
              <Button
                size="small"
                startIcon={<OpenInBrowser />}
                onClick={handleNewWindow}
              >
                Window
              </Button>
              <Button
                size="small"
                startIcon={<CancelOutlined />}
                onClick={handleClose}
              >
                Close
              </Button>
            </Box>
          </Grid>
          <Grid xs={0} sm={3} md={4} sx={[{ width: "100%" }]}>
            <></>
          </Grid>
        </Grid>
      </Toolbar>
      <GroupForm
        onClose={handleCloseGroupDialog}
        open={groupDialogOpen}
        handleSave={handleNewGroup}
      />
    </>
  ) : null;
};
