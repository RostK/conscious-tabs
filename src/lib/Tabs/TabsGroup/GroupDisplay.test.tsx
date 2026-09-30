import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { rowControlProps } from "../elements/rowControls.ts";
import { GroupItem } from "../types.ts";
import { GroupDisplay } from "./GroupDisplay.tsx";

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

const chipOf = (container: HTMLElement) =>
  container.querySelector(".MuiChip-root") as HTMLElement;

// No local beforeEach: setup.ts already reinstalls the stub before every test,
// and says to call installChrome() again only when a test needs fixtures.
// These do not — but they do need the fresh `vi.fn()`s that reinstall gives,
// which is what makes `not.toHaveBeenCalled()` below mean anything.

/**
 * The group name is a Chip, and a Chip's own `max-width: 100%` fills the text
 * box — which runs under the row's controls, so a long enough name sat beneath
 * the drag handle, the menu and the close button, tinted pill and rounded edge
 * included.
 *
 * **What these cannot catch, stated plainly.** Whether the reserve is *enough*
 * is a question about layout, and jsdom does not lay anything out: these would
 * pass just as happily at 10px. The measurement that answers it belongs in the
 * layout harness, where the controls span a real 88.3px at the float's width.
 * What is guarded here is the rule's presence and, more to the point, the
 * condition on it — the part a later edit is most likely to flatten.
 */
describe("a group name long enough to reach the row's controls", () => {
  it("keeps the pill clear of the controls", () => {
    const { container } = render(
      <GroupDisplay
        group={group({ title: "A name long enough to run under the controls" })}
        itemAction={<button aria-label="Close">x</button>}
      />,
    );

    expect(getComputedStyle(chipOf(container)).maxWidth).toBe(
      "calc(100% - 96.3px)",
    );
  });

  // The drag overlay renders this row with no controls at all. Reserving room
  // for them there would truncate the very name being dragged, which is the
  // mirror of the bug above rather than a fix for it.
  //
  // Asserts the width it should have, not the absence of the one it should
  // not: `not.toBe("calc(100% - 96.3px)")` passes for every other value too,
  // including a half-width reserve, so it would not notice the defect it is
  // here to catch. `100%` is `MuiChip-root`'s own rule showing through once
  // the `sx` contributes nothing.
  it("reserves nothing on a row that has no controls", () => {
    const { container } = render(
      <GroupDisplay
        group={group({ title: "A name long enough to run under the controls" })}
      />,
    );

    expect(getComputedStyle(chipOf(container)).maxWidth).toBe("100%");
  });

  // A short name never reached the controls, which is why this went unnoticed;
  // the cap must not be what makes it fit.
  it("still renders a short name", () => {
    const { container } = render(
      <GroupDisplay
        group={group()}
        itemAction={<button aria-label="Close">x</button>}
      />,
    );

    expect(chipOf(container)).toHaveTextContent("Reading");
  });
});

/**
 * The walk from a row that is still itself a focus target.
 *
 * The tab row is a `role="toolbar"` at tabIndex -1 now and never holds focus,
 * so `useRowKeys` stopped counting the row as a stop (SPEC-04 D-9). The group
 * row has not been converted yet (T-4) — it is still a focusable
 * `ListItemButton` — and lost Right/Left when the row was dropped for every
 * kind: focus on the row matched no stop, so nothing moved, and its controls
 * were unreachable by keyboard. The row stays the first stop while it is the
 * thing focused.
 */
describe("walking a group row's controls from the row", () => {
  const renderRow = () =>
    render(
      <GroupDisplay
        group={group()}
        itemAction={
          <>
            <button {...rowControlProps} aria-label="Actions">
              a
            </button>
            <button {...rowControlProps} aria-label="Close">
              x
            </button>
          </>
        }
      />,
    );

  it("goes from the row to its first control with Right and back with Left", () => {
    const { getByRole } = renderRow();
    const row = document.querySelector(
      ".MuiListItemButton-root",
    ) as HTMLElement;
    row.focus();
    expect(document.activeElement).toBe(row);

    fireEvent.keyDown(row, { key: "ArrowRight" });
    expect(document.activeElement).toBe(getByRole("button", { name: "Actions" }));

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(getByRole("button", { name: "Close" }));

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(row);

    // The row is the end of the walk: nothing before it.
    fireEvent.keyDown(row, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(row);
  });
});

/**
 * What a click on the row means, which the two row types had drifted apart on.
 *
 * A plain click collapses or expands the group; a modifier click selects its
 * tabs and does nothing else. The bug was that the modifier branch had no
 * `return`, so one ctrl-click did both — selecting a group collapsed it, and
 * deselecting expanded it again. `TabDisplay` has the identical branch and has
 * always returned, so this is a guard against the two disagreeing rather than
 * a fix with no history.
 */
describe("clicking a group row", () => {
  const rowOf = (container: HTMLElement) =>
    container.querySelector(".MuiListItemButton-root") as HTMLElement;

  it("collapses the group on a plain click", () => {
    const { container } = render(<GroupDisplay group={group({ id: 7 })} />);

    fireEvent.click(rowOf(container));

    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: true,
    });
  });

  it("expands a collapsed group", () => {
    const { container } = render(
      <GroupDisplay group={group({ id: 7, collapsed: true })} />,
    );

    fireEvent.click(rowOf(container));

    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: false,
    });
  });

  /**
   * The row used to collapse the group wherever it was rendered, and in search
   * results that was an invisible change to the browser: `GroupListItem` passes
   * `expandedGroups` there, which renders the group's tabs regardless of
   * `collapsed` and renders no chevron — so the click reached
   * `chrome.tabGroups.update`, the tab strip collapsed, and nothing on screen
   * moved. The user found out later, somewhere else.
   */
  it("does not collapse the group where the surface forces it open", () => {
    const { container } = render(
      <GroupDisplay group={group({ id: 7 })} collapsible={false} />,
    );

    fireEvent.click(rowOf(container));

    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });

  // Still selects: only the collapse is withheld, and a modifier click never
  // reached the toggle anyway.
  it("still selects on a modifier click where it cannot collapse", () => {
    const onCtrlClick = vi.fn();
    const { container } = render(
      <GroupDisplay
        group={group({ id: 7 })}
        collapsible={false}
        onCtrlClick={onCtrlClick}
      />,
    );

    fireEvent.click(rowOf(container), { ctrlKey: true });

    expect(onCtrlClick).toHaveBeenCalled();
    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });

  it("selects without collapsing on a modifier click", () => {
    const onCtrlClick = vi.fn();
    const { container } = render(
      <GroupDisplay group={group({ id: 7 })} onCtrlClick={onCtrlClick} />,
    );

    fireEvent.click(rowOf(container), { ctrlKey: true });

    expect(onCtrlClick).toHaveBeenCalled();
    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });

  // macOS reaches selection with Cmd, and the same fall-through applied there.
  it("treats a meta click the same way", () => {
    const onCtrlClick = vi.fn();
    const { container } = render(
      <GroupDisplay group={group({ id: 7 })} onCtrlClick={onCtrlClick} />,
    );

    fireEvent.click(rowOf(container), { metaKey: true });

    expect(onCtrlClick).toHaveBeenCalled();
    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });

  // The drag overlay renders the row without a handler. A modifier click still
  // must not collapse: the gesture means "select" whether or not this caller
  // has wired anything to it.
  it("does not collapse on a modifier click with no handler", () => {
    const { container } = render(<GroupDisplay group={group({ id: 7 })} />);

    fireEvent.click(rowOf(container), { ctrlKey: true });

    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
  });
});
