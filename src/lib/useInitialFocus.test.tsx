import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInitialFocus } from "./useInitialFocus.ts";

const Probe = () => {
  const ref = useRef<HTMLInputElement>(null);
  useInitialFocus(ref);
  return (
    <>
      <input ref={ref} aria-label="search" />
      <button type="button">a row</button>
    </>
  );
};

/** jsdom reports the document focused; the interesting case is the other one. */
const documentUnfocused = () =>
  vi.spyOn(document, "hasFocus").mockReturnValue(false);

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Measured on 2026-09-29: a side panel opened by the keyboard shortcut does not
 * take document focus — typing goes to the page behind it. Chrome offers no way
 * to ask for that focus, and forcing it is forbidden. So the caret is claimed
 * twice: on mount, and again at the moment focus actually arrives.
 */
describe("useInitialFocus", () => {
  it("puts the caret in the field on mount", () => {
    const { getByLabelText } = render(<Probe />);

    expect(document.activeElement).toBe(getByLabelText("search"));
  });

  // The whole point. A panel that never had focus gets none from us; what it
  // gets is a caret already in place for whenever focus does arrive.
  it("claims the caret again when the document first receives focus", () => {
    documentUnfocused();
    const { getByLabelText } = render(<Probe />);
    // Something took the caret away in the meantime — a re-render, a blur, the
    // browser settling. Without the second claim, the first keystroke is lost.
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);

    window.dispatchEvent(new Event("focus"));

    expect(document.activeElement).toBe(getByLabelText("search"));
  });

  /**
   * The timid half, and the reason this is not `autoFocus`. A user who arrived
   * by clicking a row has said where they want to be; taking it back is the
   * autofocus-steals-focus complaint wearing a different hat.
   */
  it("leaves the caret alone if anything else already has it", () => {
    documentUnfocused();
    const { getByRole } = render(<Probe />);
    const row = getByRole("button", { name: "a row" });
    row.focus();

    window.dispatchEvent(new Event("focus"));

    expect(document.activeElement).toBe(row);
  });

  // Already focused means the caret is where it needs to be and nothing is
  // owed. Listening anyway would arm a claim for the next alt-tab back, long
  // after the user stopped thinking about this surface opening.
  it("does not keep listening when the document was focused all along", () => {
    const { getByLabelText } = render(<Probe />);
    const row = getByLabelText("search").nextElementSibling as HTMLElement;
    row.focus();

    window.dispatchEvent(new Event("focus"));

    expect(document.activeElement).toBe(row);
  });
});
