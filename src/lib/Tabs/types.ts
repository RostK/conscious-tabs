import ColorEnum = chrome.tabGroups.ColorEnum;

export type TabItem = {
  type: "tab";
  title?: string;
  url?: string;
  id?: number;
  index: number;
  windowId: number;
  groupId: number;
  favIconUrl?: string | undefined;
  active: boolean;
  highlighted: boolean;
};
export type GroupItem = {
  type: "group";
  collapsed: boolean;
  /** The group's color. */
  color: ColorEnum;
  /** The ID of the group. Group IDs are unique within a browser session. */
  id: number;
  /** Optional. The title of the group. */
  title?: string | undefined;
  /** The ID of the window that contains the group. */
  windowId: number;
  tabs: TabItem[];
};

export type TabsStructure = (GroupItem | TabItem)[];
