import type { DndContextProps } from "@dnd-kit/core";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  dragFocusKey,
  oweFocusTo,
  setRowDragActive,
} from "../elements/rowControls.ts";
import type { DefaultDrag, DZCurrentData } from "./useDropzone.tsx";

/** When to check that a keyboard drop left focus somewhere — see `settleFocus`. */
const FOCUS_SETTLE_MS = [400, 1500];

type DragHandlers = Required<
  Pick<DndContextProps, "onDragStart" | "onDragEnd" | "onDragCancel">
>;

/**
 * One drag, from pick-up to whatever the drop leaves behind.
 *
 * The three handlers a `DndContext` takes, and everything they have to agree
 * on: what is being dragged, the flag that hands the arrow keys to dnd-kit, the
 * handle that is owed focus after a keyboard drop, the checks that find focus a
 * home when nobody holds it, and whose turn it is to decide any of that.
 *
 * This lived in `App`'s body, about ninety lines of it, beside the search field
 * and the float. Two defects found in review were both orderings between its
 * pieces — a late drop clearing a newer drop's checks, a pointer press ending
 * one claim on focus and not the other — and each had to be threaded through
 * several callbacks to fix. Here a start, an end, a cancel and a pointer press
 * are each one function, and what each resets is in one place to read.
 *
 * `dragActive` and `focusOwed` stay module flags in `rowControls.ts`, because
 * the rows read them at event time and at mount without subscribing (the
 * reasons are there). This is the only thing that writes them.
 *
 * What the app says and selects is not this hook's business, so it is told:
 * `onStart` when a drag begins, `onRefused` when a drop is rejected, and
 * `onSelectionDropped` once a dragged selection has been moved.
 */
export const useRowDrag = ({
  home,
  onStart,
  onRefused,
  onSelectionDropped,
}: {
  /** Where focus goes when nobody holds it after a keyboard drop. */
  home: RefObject<HTMLElement>;
  onStart: () => void;
  onRefused: () => void;
  onSelectionDropped: () => void;
}): DragHandlers & { dragging: DefaultDrag | null } => {
  const [dragging, setDragging] = useState<DefaultDrag | null>(null);

  // Whose turn it is to say where focus goes. A drop is carried out
  // asynchronously, and a second drag can begin while the first is still
  // awaited; the first one's tail must not move focus under the second. A
  // press of the pointer takes the turn too — see `yieldToPointer`.
  const dragTurn = useRef(0);

  // The timers `settleFocus` sets, kept so that a new drag, a cancel, a press
  // of the pointer or an unmount can call them off.
  const settling = useRef<number[]>([]);
  const stopSettling = useCallback(() => {
    settling.current.forEach((id) => {
      window.clearTimeout(id);
    });
    settling.current = [];
  }, []);

  /**
   * A press of the pointer is the user putting focus where they want it,
   * including nowhere. It ends everything the last keyboard drop still has
   * pending, and there are three such things, not one.
   *
   * It used to call off only the checks below, and only once they were set.
   * So a row rebuilt within the handle's three seconds took focus back from
   * wherever the pointer had just put it, and a press made while the drop was
   * still being carried out was answered, once it finished, by the caret
   * jumping to the search field. Found in review.
   */
  const yieldToPointer = useCallback(() => {
    dragTurn.current += 1;
    oweFocusTo(undefined);
    stopSettling();
  }, [stopSettling]);

  useEffect(() => {
    const doc = home.current?.ownerDocument;
    return () => {
      doc?.removeEventListener("pointerdown", yieldToPointer, true);
      stopSettling();
    };
  }, [home, stopSettling, yieldToPointer]);

  const onDragStart = useCallback<DragHandlers["onDragStart"]>(
    ({ active }) => {
      dragTurn.current += 1;
      // Whatever the last drop was owed is void: a row picked up again within
      // moments of a keyboard drop would otherwise take focus when a *pointer*
      // let it go. Found in review.
      oweFocusTo(undefined);
      stopSettling();
      onStart();
      setRowDragActive(true);
      setDragging(active.data.current as unknown as DefaultDrag);
    },
    [onStart, stopSettling],
  );

  const onDragCancel = useCallback<DragHandlers["onDragCancel"]>(() => {
    oweFocusTo(undefined);
    stopSettling();
    setRowDragActive(false);
    setDragging(null);
  }, [stopSettling]);

  /**
   * After a keyboard drop, focus must be *somewhere*.
   *
   * The dropped row's handle takes it when the row is rebuilt (`oweFocusTo`).
   * But a drop onto a collapsed window or group leaves no row to rebuild, and
   * dropping a selection dissolves the toolbar its handle sat in. Both were
   * measured to leave focus on the body, where no key does anything. So once
   * the list has had time to settle, focus nobody holds goes `home` — the
   * search field, the keyboard's home here, one `↓` from the list.
   *
   * Checked twice, because how long Chrome takes to report a move is not ours
   * to know: a handle can take focus and lose it again when the report lands.
   */
  const settleFocus = useCallback(
    (turn: number) => {
      stopSettling();
      settling.current = FOCUS_SETTLE_MS.map((delay) =>
        window.setTimeout(() => {
          // A newer drag owns focus now, and holds it on its own handle.
          if (dragTurn.current !== turn) return;
          const field = home.current;
          if (!field) return;
          const { activeElement, body } = field.ownerDocument;
          if (activeElement && activeElement !== body) return;
          field.focus();
        }, delay),
      );
    },
    [home, stopSettling],
  );

  const onDragEnd = useCallback<DragHandlers["onDragEnd"]>(
    async ({ over, activatorEvent }) => {
      const turn = dragTurn.current;
      const dropped = dragging;
      const byKeyboard = activatorEvent.type === "keydown";
      // A keyboard drop can move the row somewhere that rebuilds it, and the
      // handle that had focus goes with the old one. The new handle takes it
      // back as it mounts. Recorded before the drop is carried out, because
      // the rebuild can arrive while that is still awaited.
      if (byKeyboard && dropped && !Array.isArray(dropped)) {
        oweFocusTo(dragFocusKey(dropped.type, dropped.id));
      }
      // Listened for from the drop itself, not from when it has been carried
      // out: the handle is owed focus from this moment, and the press that
      // calls that off can come while the move is still awaited.
      if (byKeyboard) {
        home.current?.ownerDocument.addEventListener(
          "pointerdown",
          yieldToPointer,
          { capture: true, once: true },
        );
      }
      // Before the drop is carried out, and they used to come after it. By the
      // time dnd-kit calls this the drag is over, whatever the drop goes on to
      // do: a handler that rejected skipped these, which left the drag flag on
      // and every row's arrow keys dead until the next drag (found in review).
      // And a second drag begun while the first drop was still awaited had its
      // own flag switched off by the first one's tail.
      setRowDragActive(false);
      setDragging(null);
      const overData = over?.data.current as DZCurrentData | undefined;
      try {
        if (overData?.dropHandler && dropped) {
          await overData.dropHandler(dropped, overData);
          if (Array.isArray(dropped)) onSelectionDropped();
        }
      } catch (error) {
        // Chrome refuses some moves — a group into the middle of another, a
        // tab among pinned ones. The drop was already announced as made, so
        // the app is told to say it was not.
        console.error(error);
        onRefused();
      }
      // Only while this drop still has the turn. Setting a check clears the
      // ones pending, so the tail of a drop that finished late — after a
      // second drag had been dropped, or after a press of the pointer — took
      // away the newer claim and then stood its own down as stale, leaving
      // nothing to look after focus. Found in review.
      if (byKeyboard && dragTurn.current === turn) settleFocus(turn);
    },
    [
      dragging,
      home,
      onRefused,
      onSelectionDropped,
      settleFocus,
      yieldToPointer,
    ],
  );

  return { dragging, onDragStart, onDragEnd, onDragCancel };
};
