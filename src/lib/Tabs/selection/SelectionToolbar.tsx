import { useDraggable } from "@dnd-kit/core";
import {
  CancelOutlined,
  DeselectOutlined,
  DragIndicator,
  FolderOpen,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  ButtonBase,
  Grid,
  IconButton,
  Toolbar,
} from "@mui/material";
import {
  FC,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { promptUndo } from "../../promptUndo.tsx";
import { TabAvatarsDisplay } from "../elements/TabAvatarsDisplay.tsx";
import { TabItem } from "../types.ts";
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
    return tabsStructure.reduce((acc, item) => {
      return item.type === "group" ? [...acc, ...item.tabs] : [...acc, item];
    }, [] as TabItem[]);
  }, [tabsStructure]);

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

  return selected.length ? (
    <>
      <Toolbar sx={{ visibility: "hidden", height: "75px" }} />
      <AppBar
        position="fixed"
        color="transparent"
        sx={{ top: "auto", bottom: 0 }}
      >
        <Grid
          spacing={0}
          sx={{ width: "100%", bgcolor: "background.paper" }}
          container
        >
          <Grid xs={0} sm={3} md={4} sx={[{ width: "100%" }]} />
          <Grid xs={12} sm={6} md={4} sx={[{ width: "100%" }]}>
            <Box
              sx={{
                display: "flex",
                p: "0.5rem",
                justifyContent: "center",
                cursor: "grab",
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
                fontSize: "0.3rem",
                gap: "1rem",
                justifyContent: "center",
                p: "0 0 .3rem 0",
              }}
            >
              <ButtonBase sx={{ fontSize: "0.7rem" }} onClick={handleClear}>
                <DeselectOutlined fontSize="small" /> Deselect
              </ButtonBase>
              <ButtonBase sx={{ fontSize: "0.7rem" }} onClick={handleClose}>
                <CancelOutlined fontSize="small" />
                Close
              </ButtonBase>
              <ButtonBase
                sx={{ fontSize: "0.7rem" }}
                onClick={handleOpenGroupDialog}
              >
                <FolderOpen fontSize="small" /> New group
              </ButtonBase>
            </Box>
          </Grid>
          <Grid xs={0} sm={3} md={4} sx={[{ width: "100%" }]} />
        </Grid>
      </AppBar>
      <GroupForm
        onClose={handleCloseGroupDialog}
        open={groupDialogOpen}
        handleSave={handleNewGroup}
      />
    </>
  ) : null;
};
