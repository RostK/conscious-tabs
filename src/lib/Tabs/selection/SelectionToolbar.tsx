import {
  FC,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { SelectionContext } from "./SelectionContext.tsx";
import { useTabsStructure } from "../useTabsStructure.ts";
import {
  AppBar,
  Avatar,
  AvatarGroup,
  Box,
  ButtonBase,
  Paper,
  Toolbar,
} from "@mui/material";
import {
  ArticleOutlined,
  CancelOutlined,
  DeselectOutlined,
  FolderOpen,
} from "@mui/icons-material";
import { TabItem } from "../types.ts";
import { promptUndo } from "../../promptUndo.tsx";
import { GroupForm } from "./GroupForm.tsx";

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
    async ({ name, color }: { name: string; color: string }) => {
      try {
        const newTabId = await chrome.tabs.group({ tabIds: selected });
        await chrome.tabGroups.update(newTabId, {
          title: name,
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
      <Toolbar sx={{ visibility: "hidden" }} />
      <AppBar
        position="fixed"
        color="transparent"
        sx={{ top: "auto", bottom: 0 }}
      >
        <Paper sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", p: "0.5rem", justifyContent: "center" }}>
            <AvatarGroup
              total={flatTabs.length}
              max={10}
              slotProps={{
                additionalAvatar: {
                  sx: { fontSize: "0.7rem", width: 24, height: 24 },
                },
              }}
              renderSurplus={(surplus) => <span>{surplus}</span>}
            >
              {flatTabs.slice(0, 10).map((tab) => (
                <Avatar
                  sx={{ background: "lightgray", width: 24, height: 24 }}
                  key={tab.id}
                  src={tab.favIconUrl}
                >
                  <ArticleOutlined />
                </Avatar>
              ))}
            </AvatarGroup>
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
        </Paper>
      </AppBar>
      <GroupForm
        onClose={handleCloseGroupDialog}
        open={groupDialogOpen}
        handleSave={handleNewGroup}
      />
    </>
  ) : null;
};
