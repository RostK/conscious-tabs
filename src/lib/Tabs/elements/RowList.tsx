import { Box } from "@mui/material";
import { FC, PropsWithChildren, useLayoutEffect, useRef } from "react";

import { ROW_LABEL_ATTRIBUTE } from "./rowControls.ts";

/**
 * Says ", n of N" on every named row in the list: N is the rows rendered, n the
 * row's place among them in document order, so a filter, a close, or a collapsed
 * group changes both.
 *
 * Done here, in the DOM after commit, and not as a prop. A position handed to
 * each row re-renders every row that follows an insertion, which is the cost
 * the row memo exists to remove (PLAN-SPEC-04 D-6). React writes only the base
 * name, and only when that name changes, so it never erases a position on a
 * render where it did not also change the data attribute this reacts to. This
 * writes only when the value differs, and `aria-label` is what it writes, so
 * that is not observed.
 */
const NAMED_ROW = `[${ROW_LABEL_ATTRIBUTE}]`;

const numberRows = (list: HTMLElement) => {
  const rows = list.querySelectorAll<HTMLElement>(NAMED_ROW);
  rows.forEach((row, index) => {
    const name = `${row.getAttribute(ROW_LABEL_ATTRIBUTE)}, ${index + 1} of ${rows.length}`;
    if (row.getAttribute("aria-label") !== name) {
      row.setAttribute("aria-label", name);
    }
  });
};

/**
 * Whether what the observer saw could have changed a row's name or its place.
 *
 * Most of what comes and goes inside the list is not a row. MUI adds a ripple
 * span on every press and every keyboard focus, a favicon swaps its node, and
 * a drop placeholder arrives and leaves on each change of hover — and each of
 * those used to renumber every row, on the drag path the row memo exists to
 * keep cheap (found in review). Only two things matter: a name that changed,
 * which is the one attribute observed, and a node that was a named row or
 * held one.
 *
 * By `nodeType`, not `instanceof Element`: a node belongs to its own window's
 * classes, and this must hold for a list rendered into another document.
 */
const holdsNamedRow = (node: Node): boolean => {
  if (node.nodeType !== 1) return false;
  const element = node as Element;
  return (
    element.matches(NAMED_ROW) || element.querySelector(NAMED_ROW) !== null
  );
};

const touchesRows = (records: MutationRecord[]): boolean =>
  records.some(
    (record) =>
      record.type === "attributes" ||
      [...record.addedNodes, ...record.removedNodes].some(holdsNamedRow),
  );

/**
 * The one `list` on the surface, shared by `TabsView` and `SearchView`.
 *
 * Rows are its `listitem`s: `TabGrid` carries the role for tab, group and
 * placeholder rows, and `WindowListItem` puts it around the window header.
 *
 * Do not put any `aria-*` attribute on a wrapper between this and the items
 * (the `Grid` container, the `Grid` items, the `Dropzone` div). axe treats an
 * element with no role, no aria and no focusability as transparent, which is
 * what lets those wrappers sit here. One global aria attribute on any of them
 * turns it into an unallowed owned child of the list and fires
 * `aria-required-children` — invisible until axe runs.
 *
 * Render it only when there are rows: an empty container must not announce
 * itself as a list of zero, so callers mount it below their empty-state
 * early return.
 *
 * It also numbers the tab rows inside it (`numberRows`), and re-numbers when
 * rows are added, removed or renamed — and only then (`touchesRows`).
 */
export const RowList: FC<PropsWithChildren> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    numberRows(list);
    const observer = new MutationObserver((records) => {
      if (touchesRows(records)) numberRows(list);
    });
    observer.observe(list, {
      childList: true,
      subtree: true,
      // Never `aria-label`: that is what `numberRows` writes, and watching it
      // would have the observer wake itself.
      attributes: true,
      attributeFilter: [ROW_LABEL_ATTRIBUTE],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={ref} role="list" aria-label="Open tabs">
      {children}
    </Box>
  );
};
