import { DndContext, useDraggable } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentProps, KeyboardEventHandler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dragAnnouncements, dragInstructions } from "../DnD";
import { DragHandle } from "./DragHandle.tsx";
import { dragFocusKey, oweFocusTo } from "./rowControls.ts";

/**
 * The keyboard's way into a drag — SPEC-04 AC-11, AC-13 (its precondition) and
 * AC-15's instructions half.
 *
 * Rendered with a real `useDraggable` inside a real `DndContext`, set up the
 * way `App` sets it up, because the thing under test is what dnd-kit's
 * `attributes` do once they reach the DOM, and a hand-written stand-in for them
 * would assert whatever the stand-in said.
 */

const Harness = ({
  onRowClick,
  setActivatorNodeRef,
}: {
  onRowClick?: () => void;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef: dndRef } =
    useDraggable({ id: 1, data: { type: "tab", id: 1, title: "A tab" } });
  return (
    // The row's own click is what switches tabs; the handle sits inside it.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div ref={setNodeRef} onClick={onRowClick}>
      <button>Switch</button>
      <DragHandle
        label="Reorder A tab"
        setActivatorNodeRef={(element) => {
          dndRef(element);
          setActivatorNodeRef?.(element);
        }}
        attributes={attributes}
        onKeyDown={listeners?.onKeyDown as KeyboardEventHandler | undefined}
      />
    </div>
  );
};

const renderHandle = (props: ComponentProps<typeof Harness> = {}) =>
  render(
    <DndContext
      accessibility={{
        announcements: dragAnnouncements,
        screenReaderInstructions: dragInstructions,
      }}
    >
      <Harness {...props} />
    </DndContext>,
  );

describe("DragHandle", () => {
  // The old shape put role=button and tabIndex=0 on a wrapper around the whole
  // row, which made every row two stops, the first of them unlabelled. If
  // another element ever carries the attributes again that comes back.
  it("is the only element carrying dnd-kit's attributes, and is not a Tab stop", () => {
    const { container } = renderHandle();
    const handle = screen.getByRole("button", { name: "Reorder A tab" });

    const carriers = container.querySelectorAll("[aria-roledescription]");
    expect(Array.from(carriers)).toEqual([handle]);
    expect(handle).toHaveAttribute("aria-roledescription", "draggable");
    // dnd-kit's attributes say tabIndex 0; the row owns Tab (the handle is
    // reached with the arrows), so the handle must end at -1.
    expect(handle).toHaveAttribute("tabindex", "-1");
    // Nothing else in the harness's row was given a tabindex.
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(1);
    expect(handle).toHaveAttribute("data-row-control");
  });

  // Grabbing is not activating: the handle sits inside the row, whose click
  // switches tabs.
  it("swallows its click, so grabbing does not reach the row", async () => {
    const onRowClick = vi.fn();
    renderHandle({ onRowClick });

    await userEvent.click(screen.getByRole("button", { name: "Reorder A tab" }));
    expect(onRowClick).not.toHaveBeenCalled();

    // The control group: a click on a sibling does reach it, so the assertion
    // above is about the handle and not about the row having no listener.
    await userEvent.click(screen.getByRole("button", { name: "Switch" }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  // AC-13's precondition. Without the activator node dnd-kit has nowhere to
  // put focus back when a keyboard drag ends.
  it("hands its element to setActivatorNodeRef", () => {
    const setActivatorNodeRef = vi.fn();
    renderHandle({ setActivatorNodeRef });

    expect(setActivatorNodeRef).toHaveBeenCalledWith(
      screen.getByRole("button", { name: "Reorder A tab" }),
    );
  });

  // AC-15. The description is what a screen reader reads on landing on the
  // handle, and it is read from the element `aria-describedby` points at, which
  // DndContext renders — so this holds only if both halves are connected.
  it("is described by the drag instructions", () => {
    renderHandle();
    const handle = screen.getByRole("button", { name: "Reorder A tab" });

    const id = handle.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toHaveTextContent(
      dragInstructions.draggable,
    );
    expect(handle).toHaveAccessibleDescription(dragInstructions.draggable);
  });
});

/**
 * Focus after a keyboard drop that rebuilds the row — SPEC-04 AC-13.
 *
 * dnd-kit restores focus to the handle once. A drop that moves a tab into a
 * group, or out of one, then makes the list re-render with that row under a
 * different parent, so the handle is a new element and the one that had focus
 * is gone. Measured in Chromium on 2026-10-02: focus fell to the body and the
 * next arrow press did nothing.
 *
 * The rebuild is stood in for here by mounting a fresh handle, which is what
 * the row changing parent amounts to. What the browser adds — that the move
 * really is followed by a remount — is recorded in MANUAL-SWEEP-SPEC-04 §D.
 */
describe("a handle that is owed focus", () => {
  const Row = ({ focusKey }: { focusKey?: string }) => (
    <DragHandle
      label="Reorder A tab"
      focusKey={focusKey}
      setActivatorNodeRef={() => {}}
      attributes={{} as ComponentProps<typeof DragHandle>["attributes"]}
    />
  );

  afterEach(() => {
    oweFocusTo(undefined);
    vi.useRealTimers();
  });

  it("takes focus as it mounts, when nobody holds it", () => {
    oweFocusTo(dragFocusKey("tab", 7));

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(screen.getByRole("button", { name: "Reorder A tab" })).toHaveFocus();
  });

  it("takes it again if the row is rebuilt a second time", () => {
    // The drop itself remounts the row once (it was hidden while dragged), and
    // Chrome's report of the move remounts it again. One claim is not enough.
    oweFocusTo(dragFocusKey("tab", 7));
    const first = render(<Row focusKey={dragFocusKey("tab", 7)} />);
    first.unmount();
    expect(document.body).toHaveFocus();

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(screen.getByRole("button", { name: "Reorder A tab" })).toHaveFocus();
  });

  it("leaves focus alone when nothing is owed", () => {
    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(document.body).toHaveFocus();
  });

  it("leaves it alone when another row is owed", () => {
    oweFocusTo(dragFocusKey("tab", 8));

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(document.body).toHaveFocus();
  });

  it("does not confuse a tab and a group that share a number", () => {
    oweFocusTo(dragFocusKey("group", 7));

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(document.body).toHaveFocus();
  });

  it("does not take focus the user has already put somewhere else", () => {
    oweFocusTo(dragFocusKey("tab", 7));
    render(<input aria-label="search" />);
    screen.getByRole("textbox", { name: "search" }).focus();

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(screen.getByRole("textbox", { name: "search" })).toHaveFocus();
  });

  it("lapses, so a later rebuild of the row does not pull focus to it", () => {
    vi.useFakeTimers();
    oweFocusTo(dragFocusKey("tab", 7));
    vi.advanceTimersByTime(3001);

    render(<Row focusKey={dragFocusKey("tab", 7)} />);

    expect(document.body).toHaveFocus();
  });

  it("never takes focus without a key, as on the current-tab card", () => {
    oweFocusTo(dragFocusKey("tab", 7));

    render(<Row />);

    expect(document.body).toHaveFocus();
  });
});
