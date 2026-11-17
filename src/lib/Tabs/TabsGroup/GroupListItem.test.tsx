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

/**
 * The select checkbox used to sit in flow between the chevron and the name.
 * It is invisible until the row is hovered, but `opacity: 0` keeps its box, so
 * every group name started 37px right of the tab titles around it, behind a
 * gap with nothing in it.
 */
describe("where a group row's checkbox sits", () => {
  // By the end of its name: a group with no tabs counts as wholly selected,
  // so the fixture's button reads "Deselect…".
  const selectOf = (container: HTMLElement) =>
    container.querySelector(
      '[aria-label$="every tab in group Reading"]',
    ) as HTMLElement;

  it("takes no width, so the name follows the chevron", () => {
    const { container } = render(<GroupListItem group={group()} />);

    const style = getComputedStyle(selectOf(container));

    expect(style.position).toBe("absolute");
    expect(style.left).toBe("0px");
  });

  // Search results have no chevron. Without something in its place the name
  // would start 36px left of the tab titles instead of 37px right of them.
  it("keeps the chevron's width where there is no chevron", () => {
    const listed = render(<GroupListItem group={group()} />);
    const searched = render(<GroupListItem group={group()} expanded />);
    const spacer = (container: HTMLElement) =>
      [
        ...rowOf(container).querySelectorAll<HTMLElement>(
          ':scope > [aria-hidden="true"]',
        ),
      ].find((element) => getComputedStyle(element).width === "36px");

    expect(spacer(listed.container)).toBeUndefined();
    expect(spacer(searched.container)).toBeDefined();
  });
});
