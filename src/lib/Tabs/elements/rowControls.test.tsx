import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  rowControlProps,
  rowPrimaryProps,
  setRowDragActive,
  useRowKeys,
} from "./rowControls.ts";

/**
 * The hand-off between a row's arrow keys and dnd-kit's — SPEC-04 AC-37, and
 * the half of AC-12 that jsdom can reach.
 *
 * AC-12's first clause, "arrow presses change dnd-kit's translation", is not
 * here and cannot be: it needs layout, and jsdom has none, so KeyboardSensor
 * would compute from zero rects. What regresses, and what these assert, is the
 * other half — that the row's handler **yields** while a drag is live. The
 * translation is checked by hand (sweep §D).
 *
 * Both rows are built from the real exports (`rowPrimaryProps`,
 * `rowControlProps`, `useRowKeys`), shaped like the two rows in the product:
 * the tab row, which unmounts the moment it is picked up, and the group row,
 * which does not (E-6). Only the second is the case the flag exists for, so a
 * suite that stopped at the first would pass with the flag deleted.
 */

const Row = ({ shape }: { shape: "tab" | "group" }) => {
  const onKeyDown = useRowKeys();
  return (
    <>
      {/* Where Up would send focus if the handler did not yield. Without it a
          stray Up would find nothing and the "unchanged" assertion would pass
          for the wrong reason. */}
      <input aria-label="search" data-search-field="" />
      <div
        role="toolbar"
        aria-label={`${shape} row`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {shape === "group" && (
          <button {...rowPrimaryProps} aria-expanded>
            chevron
          </button>
        )}
        <button {...(shape === "group" ? rowControlProps : rowPrimaryProps)}>
          select
        </button>
        <button {...rowControlProps}>close</button>
        {/* The drag handle: the last control, and the one that holds focus
            for the length of a keyboard drag. */}
        <button {...rowControlProps}>handle</button>
      </div>
    </>
  );
};

const observeKey = () => {
  // On `document`, above React's root container: React's stopPropagation
  // stops the native event there, so a listener this high is reached only if
  // the handler did not stop it, and it sees `defaultPrevented` as the
  // handler left it.
  const seen: { reached: boolean; defaultPrevented: boolean }[] = [];
  const listener = (event: KeyboardEvent) => {
    seen.push({ reached: true, defaultPrevented: event.defaultPrevented });
  };
  document.addEventListener("keydown", listener);
  return {
    seen,
    stop: () => {
      document.removeEventListener("keydown", listener);
    },
  };
};

// The flag is module state. A test that leaves it set would make every key
// assertion after it, in this file or any that shares the worker, fail while
// talking about focus instead of about drags.
afterEach(() => {
  setRowDragActive(false);
});

describe.each(["tab", "group"] as const)("in a %s row", (shape) => {
  const focusControl = (name: string) => {
    const control = screen.getByRole("button", { name });
    control.focus();
    return control;
  };
  const focusHandle = () => focusControl("handle");

  // Right starts from `close`, not the handle: the handle is the last control,
  // so Right from it has nowhere to go and would pass with the flag deleted.
  it.each([
    ["ArrowLeft", "handle"],
    ["ArrowRight", "close"],
    ["ArrowUp", "handle"],
  ])("leaves %s alone while a drag is live", async (key, from) => {
    render(<Row shape={shape} />);
    const control = focusControl(from);
    setRowDragActive(true);
    const probe = observeKey();

    await userEvent.keyboard(`{${key}}`);
    probe.stop();

    expect(document.activeElement).toBe(control);
    // Reached the document, so not stopped, and not prevented either: dnd-kit's
    // sensor decides whether an arrow in a drag is a move, and prevents it
    // itself.
    expect(probe.seen).toEqual([{ reached: true, defaultPrevented: false }]);
  });

  it("walks the row with Left and Right again once the drag is over", async () => {
    render(<Row shape={shape} />);
    const handle = focusHandle();
    setRowDragActive(true);
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(handle);

    setRowDragActive(false);
    const probe = observeKey();
    await userEvent.keyboard("{ArrowLeft}");
    probe.stop();

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "close" }),
    );
    // The walk does stop the event: that is the contrast the case above
    // is the opposite of.
    expect(probe.seen).toEqual([]);

    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(handle);
  });

  it("returns to the search field with Up once the drag is over", async () => {
    render(<Row shape={shape} />);
    const handle = focusHandle();
    setRowDragActive(true);
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(handle);
    setRowDragActive(false);

    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });
});
