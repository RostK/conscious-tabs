import { ArticleOutlined } from "@mui/icons-material";
import { Avatar, AvatarGroup } from "@mui/material";
import { FC, useMemo } from "react";

import { TabItem, TabsStructure } from "../types.ts";

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
          sx: { fontSize: "0.7rem", width: 24, height: 24 },
        },
      }}
      renderSurplus={(surplus) => <span>{surplus}</span>}
    >
      {tabs.slice(0, 10).map((tab) => (
        <Avatar
          sx={{ background: "lightgray", width: 26, height: 26 }}
          key={tab.id}
          src={tab.favIconUrl}
        >
          <ArticleOutlined />
        </Avatar>
      ))}
    </AvatarGroup>
  );
};
