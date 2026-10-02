import { DndContext, useDndContext } from "@dnd-kit/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { setRowDragActive } from "../elements/rowControls.ts";
import { SelectionProvider } from "../selection";
import { GroupListItem } from "../TabsGroup/GroupListItem.tsx";
import { GroupItem, TabItem } from "../types.ts";
import { TabListItem } from "./TabListItem.tsx";

/**
 * A row cannot be dropped on itself — SPEC-04 AM-5.
 *
 * The row stays mounted while it is dragged, so its drop zones are still
 * registered, and the drag overlay starts exactly on top of them. They are
 * switched off for the length of the drag instead.
 *
 * Asked of dnd-kit's own registry and not of a collision, because jsdom has no
 * layout: every rect is zero, nothing is ever "over" anything, and a test that
 * waited for a self-drop would pass with the switch deleted. (It did: removing
 * `disabled` left the whole suite green, which is how this file came to exist.)
 */

const tab = (over: Partial<TabItem> = {}): TabItem => ({
  type: "tab",
  id: 1,
  index: 0,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "First tab",
  url: "https://example.com/",
  ...over,
});

const GROUP: GroupItem = {
  type: "group",
  id: 500,
  collapsed: false,
  color: "purple",
  windowId: 1,
  title: "Reading",
  tabs: [tab({ id: 2, index: 1, title: "In the group", groupId: 500 })],
};

/** Reads which zones dnd-kit currently holds as switched off. */
const zones: { disabled: (id: string) => boolean | undefined } = {
  disabled: () => undefined,
};
const Probe = () => {
  const { droppableContainers } = useDndContext();
  zones.disabled = (id) => droppableContainers.get(id)?.disabled;
  return null;
};

const renderRows = () =>
  render(
    <SelectionProvider>
      <DndContext>
        <Probe />
        <TabListItem tab={tab()} />
        <GroupListItem group={GROUP} />
      </DndContext>
    </SelectionProvider>,
  );

const pickUp = async (name: string) => {
  screen.getByRole("button", { name }).focus();
  await userEvent.keyboard(" ");
  await waitFor(() =>
    expect(screen.getByRole("button", { name })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
};

beforeEach(() => {
  installChrome();
  setRowDragActive(false);
});

describe("a row's own drop zones, while that row is dragged", () => {
  it("are on at rest", () => {
    renderRows();

    expect(zones.disabled("tab--1")).toBe(false);
    expect(zones.disabled("group--500")).toBe(false);
    expect(zones.disabled("group-inner--500")).toBe(false);
  });

  it("are switched off for a tab row, and back on when the drag ends", async () => {
    renderRows();

    await pickUp("Reorder First tab");

    await waitFor(() => expect(zones.disabled("tab--1")).toBe(true));
    // Only its own: every other row is still somewhere to drop.
    expect(zones.disabled("tab--2")).toBe(false);
    expect(zones.disabled("group--500")).toBe(false);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(zones.disabled("tab--1")).toBe(false));
  });

  it("are switched off for a group row, both of them", async () => {
    renderRows();

    await pickUp("Reorder group Reading");

    await waitFor(() => expect(zones.disabled("group--500")).toBe(true));
    expect(zones.disabled("group-inner--500")).toBe(true);
    expect(zones.disabled("tab--1")).toBe(false);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(zones.disabled("group--500")).toBe(false));
    expect(zones.disabled("group-inner--500")).toBe(false);
  });
});
