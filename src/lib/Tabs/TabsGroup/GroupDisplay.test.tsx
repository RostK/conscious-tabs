import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
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

beforeEach(() => {
  installChrome();
});

/**
 * The group name is a Chip, and a Chip's own `max-width: 100%` fills the text
 * box — which runs under the row's controls, so a long enough name sat beneath
 * the drag handle, the menu and the close button, tinted pill and rounded edge
 * included.
 *
 * **What these cannot catch, stated plainly.** Whether 96px is *enough* is a
 * question about layout, and jsdom does not lay anything out: these would pass
 * just as happily at 10px. The measurement that answers it belongs in the
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
      "calc(100% - 96px)",
    );
  });

  // The drag overlay renders this row with no controls at all. Reserving room
  // for them there would truncate the very name being dragged, which is the
  // mirror of the bug above rather than a fix for it.
  it("reserves nothing on a row that has no controls", () => {
    const { container } = render(
      <GroupDisplay
        group={group({ title: "A name long enough to run under the controls" })}
      />,
    );

    expect(getComputedStyle(chipOf(container)).maxWidth).not.toBe(
      "calc(100% - 96px)",
    );
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
