import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { GroupItem } from "../types.ts";
import { GroupListItem } from "./GroupListItem.tsx";

const group = (over: Partial<GroupItem> = {}): GroupItem => ({
  type: "group",
  id: 500,
  title: "Reading",
  color: "purple",
  collapsed: false,
  windowId: 1,
  tabs: [],
  ...over,
});

const rowOf = (container: HTMLElement) =>
  container.querySelector(".MuiListItemButton-root") as HTMLElement;

beforeEach(() => {
  installChrome();
});

/**
 * The wiring, not the guard — `GroupDisplay` is tested on its own, and a
 * correct guard behind a prop nobody passes is the same bug with an extra
 * indirection.
 *
 * `expanded` is what search results pass (`SearchView` renders `Tabs` with
 * `expandedGroups`), and it is already the condition the chevron is gated on.
 * Both have to agree: a row with no chevron must not collapse, because there
 * would be nothing on screen to show that it had.
 */
describe("what a group row's click does in each surface", () => {
  it("collapses the group in the tab list, where a chevron shows it", () => {
    const { container } = render(<GroupListItem group={group({ id: 7 })} />);

    fireEvent.click(rowOf(container));

    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: true,
    });
  });

  it("does not collapse it in search results, where nothing would show it", () => {
    const { container } = render(
      <GroupListItem group={group({ id: 7 })} expanded />,
    );

    fireEvent.click(rowOf(container));

    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });

  // The two conditions have to stay the same condition. A chevron with no
  // collapse behind it, or a collapse with no chevron, are both the defect.
  it("shows a chevron exactly where the click collapses", () => {
    const listed = render(<GroupListItem group={group()} />);
    const searched = render(<GroupListItem group={group()} expanded />);

    expect(
      listed.container.querySelector('[data-testid="ExpandLessIcon"]'),
    ).not.toBeNull();
    expect(
      searched.container.querySelector('[data-testid="ExpandLessIcon"]'),
    ).toBeNull();
  });
});
