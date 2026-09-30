import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { rowControlProps } from "../elements/rowControls.ts";
import { SelectionProvider } from "../selection";
import { GroupItem, TabItem } from "../types.ts";
import { GroupDisplay } from "./GroupDisplay.tsx";
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

const chipOf = (container: HTMLElement) =>
  container.querySelector(".MuiChip-root") as HTMLElement;

const tabOf = (id: number): TabItem => ({
  type: "tab",
  id,
  index: id,
  windowId: 1,
  groupId: 500,
  active: false,
  highlighted: false,
  title: `Tab ${id}`,
  url: `https://example.com/${id}`,
});

const rowOf = (container: HTMLElement) =>
  container.querySelector(".MuiListItemButton-root") as HTMLElement;

const controlsOf = (row: HTMLElement) => [
  ...row.querySelectorAll<HTMLElement>("[data-row-control]"),
];
const namesOf = (row: HTMLElement) =>
  controlsOf(row).map((control) => control.getAttribute("aria-label"));
const chevronOf = (row: HTMLElement) =>
  within(row).getByRole("button", { name: "Tabs" });

/**
 * The group row as the list builds it, and its toolbar.
 *
 * Three tabs, so the name has a count to carry. `expanded` is what search
 * results pass; a group that is collapsed and not `expanded` renders no tab rows
 * of its own, but an expanded one does, so the toolbar is found by its name
 * rather than as "the" toolbar.
 */
const renderGroup = (over: Partial<GroupItem> = {}, expanded?: boolean) => {
  const view = render(
    <SelectionProvider>
      <GroupListItem
        group={group({ tabs: [tabOf(11), tabOf(12), tabOf(13)], ...over })}
        expanded={expanded}
      />
    </SelectionProvider>,
  );
  const row = screen.getByRole("toolbar", { name: /, group, \d+ tabs?$/ });
  return { ...view, row };
};

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
 * The walk along a group row's controls.
 *
 * The row is a `role="toolbar"` at tabIndex -1 now (SPEC-04 T-4), so it is never
 * itself the focus target, and `useRowKeys` does not count it as a stop (D-9's
 * second update: a row is a stop exactly when `row.tabIndex >= 0`). This walk
 * used to start from the row, back when the row was a focusable button.
 */
describe("walking a group row's controls", () => {
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

  it("goes from the first control to the next with Right and back with Left, and never onto the row", () => {
    const { getByRole } = renderRow();
    const row = getByRole("toolbar");
    const actions = getByRole("button", { name: "Actions" });
    const close = getByRole("button", { name: "Close" });
    actions.focus();

    fireEvent.keyDown(actions, { key: "ArrowRight" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(actions);

    // The first control is the start of the walk: the row is not a stop behind
    // it, because it is not something focus can rest on.
    fireEvent.keyDown(actions, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(actions);
    expect(document.activeElement).not.toBe(row);
  });
});

/**
 * A group row is one `toolbar`, named for its group (SPEC-04 AC-28, AC-29).
 *
 * The wording is a proposal that is judged by ear, in the same way AM-3's tab
 * row was: the title once and first, then what kind of row this is, then how
 * much is in it. These pin the *shape* — a non-empty string that is distinct
 * from the controls' own names — and the exact wording once, so that changing it
 * after the listen is a one-line edit plus one line here.
 */
describe("a group row is a toolbar", () => {
  it("never takes focus itself, and is named for its group", () => {
    const { container } = render(
      <GroupDisplay group={group({ tabs: [tabOf(1), tabOf(2), tabOf(3)] })} />,
    );
    const row = rowOf(container);

    // Asserted on the rendered element, not the props: ButtonBase sets
    // role="button" on a non-button component and spreads the caller's props
    // after it, so an explicit role wins — a reading of MUI's source, and this
    // is what says so if an upgrade reverses the order (same as the tab row).
    expect(row).toHaveAttribute("role", "toolbar");
    expect(row).toHaveAttribute("tabindex", "-1");
    expect(row).toHaveAttribute("aria-label", "Reading, group, 3 tabs");
    expect(screen.getAllByRole("toolbar")).toHaveLength(1);
    // Group rows are not numbered: AM-3's "n of N" is for tab rows, and
    // `RowList` only touches rows that carry this marker.
    expect(row).not.toHaveAttribute("data-row-label");
  });

  it("counts its tabs, in the singular too", () => {
    const one = render(<GroupDisplay group={group({ tabs: [tabOf(1)] })} />);
    expect(rowOf(one.container)).toHaveAttribute(
      "aria-label",
      "Reading, group, 1 tab",
    );
    one.unmount();

    const none = render(<GroupDisplay group={group({ tabs: [] })} />);
    expect(rowOf(none.container)).toHaveAttribute(
      "aria-label",
      "Reading, group, 0 tabs",
    );
  });

  it("names an untitled group rather than leaving the toolbar blank", () => {
    const empty = render(
      <GroupDisplay group={group({ title: "", tabs: [tabOf(1), tabOf(2)] })} />,
    );
    expect(rowOf(empty.container)).toHaveAttribute(
      "aria-label",
      "Untitled, group, 2 tabs",
    );
    empty.unmount();

    const missing = render(
      <GroupDisplay group={group({ title: undefined, tabs: [tabOf(1)] })} />,
    );
    expect(rowOf(missing.container)).toHaveAttribute(
      "aria-label",
      "Untitled, group, 1 tab",
    );
  });

  // AC-24: a group title comes from the user, but it is still handed to
  // `aria-label` as a string and reaches no sink.
  it("carries a hostile title as literal text", () => {
    const title = '<img src=x onerror="alert(1)"> ‮evil';
    const { container } = render(<GroupDisplay group={group({ title })} />);

    expect(rowOf(container)).toHaveAttribute(
      "aria-label",
      `${title}, group, 0 tabs`,
    );
    // The row's own chip shows the title as text too; no element is made of it.
    expect(container.querySelector("img")).toBeNull();
  });
});

/**
 * The group row as the list builds it: the chevron, the select-all control, and
 * the row's secondary actions, in the order the toolbar walks them.
 */
describe("a group row's controls in the tab list", () => {
  it("walks chevron, select, menu, close, reorder", () => {
    const { row } = renderGroup();

    expect(namesOf(row)).toEqual([
      "Tabs",
      "Select every tab in group Reading",
      "Actions for group Reading",
      "Close every tab in group Reading",
      "Reorder group Reading",
    ]);
  });

  it("is one tab stop, the chevron, with every other control outside the tab order", () => {
    const { row } = renderGroup();
    const chevron = chevronOf(row);

    expect(chevron).toHaveAttribute("tabindex", "0");
    expect([...row.querySelectorAll("[tabindex='0']")]).toEqual([chevron]);
    controlsOf(row)
      .filter((control) => control !== chevron)
      .forEach((control) => {
        expect(control).toHaveAttribute("tabindex", "-1");
      });
    // AC-10 by construction: the one stop is not in the `.itemAction` group
    // that `rowControlsSx` hides, so it can never be a silent stop.
    expect(chevron.closest(".itemAction")).toBeNull();
  });

  it("names its chevron for what it opens, and lets aria-expanded say the state", () => {
    const open = renderGroup({ collapsed: false });
    const chevron = chevronOf(open.row);

    // Deliberately no "Expand" or "Collapse": an APG disclosure button keeps
    // one name and lets its state speak, so the screen reader says
    // "Tabs, button, expanded" and "Tabs, button, collapsed".
    expect(chevron).toHaveAccessibleName("Tabs");
    expect(chevron).toHaveAttribute("aria-expanded", "true");
    expect(chevron).not.toHaveAttribute("aria-hidden");
    expect(chevron.closest("[aria-hidden]")).toBeNull();
    open.unmount();

    const shut = renderGroup({ collapsed: true });
    expect(chevronOf(shut.row)).toHaveAttribute("aria-expanded", "false");
    expect(chevronOf(shut.row)).toHaveAccessibleName("Tabs");
  });

  it("ends on the drag handle, which carries the edge Close gave up", () => {
    const { row } = renderGroup();
    const controls = controlsOf(row);
    const handle = controls[controls.length - 1];

    expect(handle).toHaveAttribute("aria-label", "Reorder group Reading");
    expect(handle).toHaveClass("MuiIconButton-edgeEnd");
    expect(
      within(row).getByRole("button", { name: /^Close every tab/ }),
    ).not.toHaveClass("MuiIconButton-edgeEnd");
    expect(
      controls.filter((control) =>
        control.classList.contains("MuiIconButton-edgeEnd"),
      ),
    ).toHaveLength(1);
  });

  it("walks with Right and back with Left and stops dead at both ends", () => {
    const { row } = renderGroup();
    const controls = controlsOf(row);

    controls[0].focus();
    // Nothing before the chevron: the row is not a stop.
    fireEvent.keyDown(controls[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(controls[0]);

    controls.slice(1).forEach((control) => {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      expect(document.activeElement).toBe(control);
    });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(controls[controls.length - 1]);

    [...controls]
      .reverse()
      .slice(1)
      .forEach((control) => {
        fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
        expect(document.activeElement).toBe(control);
      });
    expect(document.activeElement).toBe(chevronOf(row));
  });

  // The visible indicator is the row's, not the chevron's: focus bubbles, so the
  // ListItemButton around it picks up `Mui-focusVisible`. Restyling the chevron
  // would double it, and stopping the event would lose it.
  it("lights the row's own focus indicator when the chevron takes keyboard focus", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup();

    expect(row).not.toHaveClass("Mui-focusVisible");
    await user.tab();

    expect(document.activeElement).toBe(chevronOf(row));
    expect(row).toHaveClass("Mui-focusVisible");
  });

  // AC-29 and AC-19: the toolbar's name must not converge with a control's, and
  // the select-all, menu and close names are the ones they were.
  it("keeps the toolbar's name distinct from every control's", () => {
    const { row } = renderGroup();
    const toolbarName = row.getAttribute("aria-label");

    expect(toolbarName).toBe("Reading, group, 3 tabs");
    expect(toolbarName).not.toMatch(/^Actions for/);
    expect(namesOf(row)).not.toContain(toolbarName);
  });
});

/**
 * Enter and Space on the chevron do what a click on the row body does in the
 * tab list — once. The row keeps its own `onClick` for the pointer, and the
 * chevron sits inside it, so an unstopped click would collapse the group and
 * then expand it again.
 */
describe("the chevron", () => {
  it("collapses an expanded group on Enter, exactly once", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ id: 7, collapsed: false });

    chevronOf(row).focus();
    await user.keyboard("{Enter}");

    expect(chrome.tabGroups.update).toHaveBeenCalledTimes(1);
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: true,
    });
  });

  it("expands a collapsed group on Space, exactly once", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ id: 7, collapsed: true });

    chevronOf(row).focus();
    await user.keyboard(" ");

    expect(chrome.tabGroups.update).toHaveBeenCalledTimes(1);
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: false,
    });
  });

  it("collapses once on a click, not twice through the row", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ id: 7, collapsed: false });

    await user.click(chevronOf(row));

    expect(chrome.tabGroups.update).toHaveBeenCalledTimes(1);
  });

  // AC-18: a modifier click selects and does nothing else. The chevron is
  // inside the row that owns that gesture, so it has to let it through.
  it("still selects on a modifier click, and does not collapse", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ id: 7, collapsed: true });
    expect(
      within(row).getByRole("button", { name: /^Select every tab/ }),
    ).toBeInTheDocument();

    await user.keyboard("{Control>}");
    await user.click(chevronOf(row));
    await user.keyboard("{/Control}");

    expect(chrome.tabGroups.update).not.toHaveBeenCalled();
    expect(
      within(row).getByRole("button", { name: /^Deselect every tab/ }),
    ).toBeInTheDocument();
  });

  it("still collapses on a click on the row body", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ id: 7, collapsed: false });

    await user.click(row);

    expect(chrome.tabGroups.update).toHaveBeenCalledTimes(1);
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, {
      collapsed: true,
    });
  });
});

/**
 * Search results force groups open, render no chevron, and — for the click —
 * collapse nothing (`collapsible`, the 81886bf guard). So the group row has no
 * primary action, and its toolbar begins at select-all (SPEC-04 AC-32, AM-2,
 * plan D-8). Without a stop there the row would have no Tab stop at all.
 */
describe("a group row in search results", () => {
  it("has no chevron, and begins at select-all as the row's one tab stop", () => {
    const { row } = renderGroup({ collapsed: false }, true);

    expect(within(row).queryByRole("button", { name: "Tabs" })).toBeNull();
    expect(row.querySelector("[aria-expanded]")).toBeNull();
    expect(namesOf(row)).toEqual([
      "Select every tab in group Reading",
      "Actions for group Reading",
      "Close every tab in group Reading",
      "Reorder group Reading",
    ]);

    const [selectAll, ...others] = controlsOf(row);
    expect(selectAll).toHaveAttribute("tabindex", "0");
    expect([...row.querySelectorAll("[tabindex='0']")]).toEqual([selectAll]);
    others.forEach((control) => {
      expect(control).toHaveAttribute("tabindex", "-1");
    });
  });

  it("is still one toolbar with the same name, and ends on the handle", () => {
    const { row } = renderGroup({ collapsed: false }, true);
    const controls = controlsOf(row);

    expect(row).toHaveAttribute("role", "toolbar");
    expect(row).toHaveAttribute("aria-label", "Reading, group, 3 tabs");
    expect(controls[controls.length - 1]).toHaveClass("MuiIconButton-edgeEnd");
  });

  it("walks from select-all, which Tab reaches", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup({ collapsed: false }, true);
    const controls = controlsOf(row);

    await user.tab();
    expect(document.activeElement).toBe(controls[0]);
    fireEvent.keyDown(controls[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(controls[1]);
    fireEvent.keyDown(controls[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(controls[0]);
    fireEvent.keyDown(controls[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(controls[0]);
  });
});

/**
 * E-15: the actions `Menu` is a portal, so focus leaves the toolbar while it is
 * open. Nothing has to survive that — the row's Tab stop is fixed (D-5), so
 * there is no roving state to restore, and AC-36 forbids remembering one. What
 * does have to hold is that the controls stay showing while the menu is
 * anchored to one, and that it does so with `opacity`: `visibility: hidden`
 * would take a control out of `focus()` altogether (rowControls.ts, E-13).
 */
describe("a group row whose actions menu is open", () => {
  it("holds its controls visible, by opacity and never by visibility", async () => {
    const user = userEvent.setup();
    const { row } = renderGroup();
    const close = within(row).getByRole("button", { name: /^Close every tab/ });
    const actions = within(row).getByRole("button", {
      name: "Actions for group Reading",
    });
    const controls = close.closest(".itemAction") as HTMLElement;

    expect(getComputedStyle(controls).opacity).toBe("0");
    // Opened from the keyboard, not with `fireEvent.click`: jsdom's `:hover`
    // matches the row after a synthetic click, and the hover rule would then
    // reveal the controls by itself and pass this without the override.
    actions.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Neither focus nor hover is holding them: the menu took focus into its
    // portal, so the open state alone is what does.
    expect(row.contains(document.activeElement)).toBe(false);
    expect(row.matches(":hover")).toBe(false);
    expect(getComputedStyle(controls).opacity).toBe("1");
    expect(getComputedStyle(controls).visibility).not.toBe("hidden");
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
