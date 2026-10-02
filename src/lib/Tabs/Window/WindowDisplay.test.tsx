import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { rowControlProps } from "../elements/rowControls.ts";
import { TabItem } from "../types.ts";
import { WindowDisplay } from "./WindowDisplay.tsx";

const tab = (id: number): TabItem => ({
  type: "tab",
  id,
  index: id - 1,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: `Tab ${id}`,
  url: `https://example.com/${id}`,
});

const LABEL = "Window 1, 2 tabs, current window";

/**
 * The window row as the list builds it, minus the list: a select control in
 * `pre`, a close control in `itemAction`, and the switch button WindowDisplay
 * adds itself. `handleOpenClick` is what both the row body and the chevron call.
 */
const renderRow = (over: { isOpen?: boolean; open?: () => void } = {}) => {
  const open = over.open ?? vi.fn();
  const view = render(
    <WindowDisplay
      label={LABEL}
      tabs={[tab(1), tab(2)]}
      isOpen={over.isOpen}
      handleOpenClick={open}
      handleActivateClick={vi.fn()}
      pre={
        <button {...rowControlProps} aria-label="Select every tab in this window">
          s
        </button>
      }
      itemAction={
        <button {...rowControlProps} aria-label="Close this window and its 2 tabs">
          x
        </button>
      }
    />,
  );
  const row = screen.getByRole("toolbar");
  return { ...view, row, open };
};

const controlsOf = (row: HTMLElement) => [
  ...row.querySelectorAll<HTMLElement>("[data-row-control]"),
];
const chevronOf = (row: HTMLElement) =>
  within(row).getByRole("button", { name: "Tabs" });

/**
 * A window row is one `toolbar`, named by its `label` (SPEC-04 AC-28, AC-29).
 *
 * The wording is composed by WindowListItem and asserted through the list in
 * rows.a11y.test.tsx; what is pinned here is the shape: a non-empty name that is
 * the prop, on an element that is never itself a focus target.
 */
describe("a window row is a toolbar", () => {
  it("never takes focus itself, and is named by its label", () => {
    const { row } = renderRow();

    // Asserted on the rendered element, not the props: ButtonBase sets
    // role="button" on a non-button component and spreads the caller's props
    // after it, so an explicit role wins — a reading of MUI's source, and this
    // is what says so if an upgrade reverses the order (same as the other rows).
    expect(row).toHaveAttribute("role", "toolbar");
    expect(row).toHaveAttribute("tabindex", "-1");
    expect(row).toHaveAccessibleName(LABEL);
    expect(screen.getAllByRole("toolbar")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: LABEL })).toBeNull();
  });

  // AC-29: the toolbar's name must not equal or start like any control's.
  it("keeps its name distinct from every control's, and keeps the switch button's", () => {
    const { row } = renderRow();
    const names = controlsOf(row).map((control) =>
      control.getAttribute("aria-label"),
    );

    expect(names).not.toContain(LABEL);
    names.forEach((name) => {
      expect(name?.startsWith("Window ")).toBe(false);
    });
    // E-12: the measured-count name is untouched.
    expect(
      screen.getByRole("button", { name: /Switch to this window, 2 tabs/ }),
    ).toBeInTheDocument();
  });
});

/**
 * The walk along a window row's controls. The row is a toolbar at tabIndex -1
 * now (SPEC-04 T-5), so focus never rests on it and `useRowKeys` does not count
 * it as a stop (D-9's second update: a row is a stop exactly when
 * `row.tabIndex >= 0`). This walk used to start from the row, back when the row
 * was a focusable button and Right moved onto its first control.
 */
describe("walking a window row's controls", () => {
  it("walks chevron, select, close, switch with Right, and back with Left", () => {
    const { row } = renderRow();
    const controls = controlsOf(row);

    expect(
      controls.map((control) => control.getAttribute("aria-label")),
    ).toEqual([
      "Tabs",
      "Select every tab in this window",
      "Close this window and its 2 tabs",
      "Switch to this window, 2 tabs",
    ]);

    controls[0].focus();
    controls.slice(1).forEach((control) => {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      expect(document.activeElement).toBe(control);
    });
    [...controls]
      .reverse()
      .slice(1)
      .forEach((control) => {
        fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
        expect(document.activeElement).toBe(control);
      });
    expect(document.activeElement).toBe(chevronOf(row));
  });

  it("stops dead at both ends, and never lands on the row", () => {
    const { row } = renderRow();
    const controls = controlsOf(row);
    const first = controls[0];
    const last = controls[controls.length - 1];

    // Nothing before the chevron: the row is not a stop behind it.
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(row);

    // The switch button is last, and Right from it goes nowhere.
    last.focus();
    expect(last).toHaveAccessibleName(/^Switch to this window/);
    fireEvent.keyDown(last, { key: "ArrowRight" });
    expect(document.activeElement).toBe(last);
  });

  it("is one tab stop, the chevron, with every other control outside the tab order", () => {
    const { row } = renderRow();
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

  // The visible indicator is the row's, not the chevron's: focus bubbles, so the
  // ListItemButton around it picks up `Mui-focusVisible`. Restyling the chevron
  // would double it, and stopping the event would lose it.
  it("lights the row's own focus indicator when the chevron takes keyboard focus", async () => {
    const user = userEvent.setup();
    const { row } = renderRow();

    expect(row).not.toHaveClass("Mui-focusVisible");
    await user.tab();

    expect(document.activeElement).toBe(chevronOf(row));
    expect(row).toHaveClass("Mui-focusVisible");
  });
});

/**
 * The chevron is the row's primary action: it does what a click on the row body
 * does, once. The row keeps its own `onClick` for the pointer and the chevron
 * sits inside it, so an unstopped click would toggle twice and end where it
 * started.
 */
describe("the chevron", () => {
  it("is named, exposes the state, and is not hidden from assistive tech", () => {
    const shut = renderRow({ isOpen: false });
    expect(chevronOf(shut.row)).toHaveAccessibleName("Tabs");
    expect(chevronOf(shut.row)).toHaveAttribute("aria-expanded", "false");
    shut.unmount();

    const open = renderRow({ isOpen: true });
    const chevron = chevronOf(open.row);
    // Deliberately no "Show" or "Hide": an APG disclosure button keeps one name
    // and lets its state speak, so the name is the same open and shut.
    expect(chevron).toHaveAccessibleName("Tabs");
    expect(chevron).toHaveAttribute("aria-expanded", "true");
    expect(chevron).not.toHaveAttribute("aria-hidden");
    expect(chevron.closest("[aria-hidden]")).toBeNull();
  });

  it("toggles once on Enter", async () => {
    const user = userEvent.setup();
    const { row, open } = renderRow();

    chevronOf(row).focus();
    await user.keyboard("{Enter}");

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("toggles once on Space", async () => {
    const user = userEvent.setup();
    const { row, open } = renderRow();

    chevronOf(row).focus();
    await user.keyboard(" ");

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("toggles once on a click, not twice through the row", async () => {
    const user = userEvent.setup();
    const { row, open } = renderRow();

    await user.click(chevronOf(row));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("still toggles once on a click on the row body", async () => {
    const user = userEvent.setup();
    const { row, open } = renderRow();

    await user.click(row);

    expect(open).toHaveBeenCalledTimes(1);
  });
});

/**
 * SPEC-04 §11: a name is a string, never a reference. See the same block in
 * TabDisplay.test.tsx for why. The window row's label is built from a window id
 * and a tab count rather than anything a page chose, but it is held to the same
 * rule: nothing it says is also an `id`, and nothing is named by reference.
 */
describe("a window row's names are strings, not references", () => {
  it("builds no aria-labelledby or aria-describedby, and no id from its label or its tabs", () => {
    const { container } = renderRow({ isOpen: true });
    const everything = [...container.querySelectorAll("*")];

    expect(everything.length).toBeGreaterThan(10);
    everything.forEach((element) => {
      expect(element).not.toHaveAttribute("aria-labelledby");
      expect(element).not.toHaveAttribute("aria-describedby");
      ["Window", "example.com", "Tab 1", "Tab 2"].forEach((piece) =>
        expect(element.id).not.toContain(piece),
      );
    });
  });
});

/**
 * Flow content in a button: HTML allows only phrasing content inside one.
 *
 * The "Switch to this window" control wraps `TabAvatarsDisplay`, whose
 * `AvatarGroup` and `Avatar`s are `div`s. So it is a `div` with
 * `role="button"`, the same repair the tab row's primary got: MUI gives a
 * non-button component the role and handles Enter and Space itself.
 */
describe("a window row's buttons", () => {
  it("contain no div or p", () => {
    const { row } = renderRow();

    expect(row.querySelectorAll("button").length).toBeGreaterThanOrEqual(3);
    expect(row.querySelectorAll("button div, button p")).toHaveLength(0);
  });

  it("keeps the switch control a button to assistive technology", () => {
    const { row } = renderRow();
    const control = within(row).getByRole("button", {
      name: /^Switch to this window/,
    });

    // Not a native button, or the avatars inside it would be invalid again.
    expect(control.tagName).toBe("DIV");
    expect(control.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  // user-event does not synthesise a click for a div, so these two pass only
  // because MUI's own key handling does: Enter on keydown, Space on keyup.
  it.each(["{Enter}", " "])("switches on %j, once", async (key) => {
    const user = userEvent.setup();
    const activate = vi.fn();
    render(
      <WindowDisplay
        label={LABEL}
        tabs={[tab(1), tab(2)]}
        handleOpenClick={vi.fn()}
        handleActivateClick={activate}
      />,
    );

    screen.getByRole("button", { name: /^Switch to this window/ }).focus();
    await user.keyboard(key);

    expect(activate).toHaveBeenCalledTimes(1);
  });
});
