import { fireEvent, render, screen } from "@testing-library/react";
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

/**
 * The walk from a row that is still itself a focus target.
 *
 * The tab row is a `role="toolbar"` at tabIndex -1 now and never holds focus,
 * so `useRowKeys` stopped counting the row as a stop (SPEC-04 D-9). The window
 * row has not been converted yet (T-5) — it is still a focusable
 * `ListItemButton` — and lost Right/Left when the row was dropped for every
 * kind: focus on the row matched no stop, so nothing moved, and its controls
 * were unreachable by keyboard. The row stays the first stop while it is the
 * thing focused.
 */
describe("walking a window row's controls from the row", () => {
  it("goes from the row to its first control with Right and back with Left", () => {
    render(
      <WindowDisplay
        tabs={[tab(1), tab(2)]}
        handleOpenClick={vi.fn()}
        handleActivateClick={vi.fn()}
        itemAction={
          <button {...rowControlProps} aria-label="Close window">
            x
          </button>
        }
      />,
    );
    const row = document.querySelector(
      ".MuiListItemButton-root",
    ) as HTMLElement;
    row.focus();
    expect(document.activeElement).toBe(row);

    fireEvent.keyDown(row, { key: "ArrowRight" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close window" }),
    );

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Switch to this window, 2 tabs/ }),
    );

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(row);

    // The row is the end of the walk: nothing before it.
    fireEvent.keyDown(row, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(row);
  });
});
