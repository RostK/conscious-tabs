import ColorEnum = chrome.tabGroups.ColorEnum;

export type TabItem = {
  type: "tab";
  title?: string;
  url?: string;
  id?: number;
  index: number;
  windowId: number;
  groupId: number;
  active: boolean;
  highlighted: boolean;
  pinned?: boolean;
  audible?: boolean;
  mutedInfo?: chrome.tabs.MutedInfo;
  /**
   * The site's own icon URL, carried **only as a change token** — never
   * fetched. SPEC-03 moved favicons to the browser's own store precisely so
   * this URL is not requested, and nothing here requests it.
   *
   * It is the one signal that Chrome's icon for a page has changed. The
   * `_favicon` endpoint is keyed by page URL, which stays put after a
   * navigation settles, so without this a globe cached while the page was
   * still loading is the icon that row keeps.
   */
  favIconUrl?: string;
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
