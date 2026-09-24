import { ArticleOutlined } from "@mui/icons-material";
import { Avatar, AvatarGroup, Box } from "@mui/material";
import { FC, useMemo } from "react";

import { srOnly } from "../../srOnly.ts";
import { TabItem, TabsStructure } from "../types.ts";
import { faviconUrl } from "./favicon.ts";

export const TabAvatarsDisplay: FC<{ tabsStructure: TabsStructure }> = ({
  tabsStructure,
}) => {
  const tabs = useMemo(
    () => tabsStructure.filter(({ type }) => type === "tab"),
    [tabsStructure],
  ) as TabItem[];
  return (
    <AvatarGroup
      total={tabs.length}
      max={10}
      slotProps={{
        additionalAvatar: {
          sx: {
            fontSize: "0.7rem",
            width: 24,
            height: 24,
            // MUI's own surplus avatar is grey with near-white text, which
            // measured 1.67:1 against a 4.5 requirement — the one number on
            // screen that could not be read. These two tokens invert together
            // with the theme, so the pair stays legible in both.
            bgcolor: "text.secondary",
            color: "background.paper",
          },
        },
      }}
      renderSurplus={(surplus) => (
        <span>
          {surplus}
          {/* Aloud this was "three" — a number with nothing to attach it to.
              The visible glyph stays a bare count; the sentence is for the
              listener, who has no row of favicons to infer it from. */}
          <Box component="span" sx={srOnly}>
            {` more tab${surplus === 1 ? "" : "s"}`}
          </Box>
        </span>
      )}
    >
      {tabs.slice(0, 10).map((tab) => (
        <Avatar
          sx={{ background: "lightgray", width: 26, height: 26 }}
          key={tab.id}
          src={faviconUrl(tab.url, 26)}
        >
          <ArticleOutlined />
        </Avatar>
      ))}
    </AvatarGroup>
  );
};
