import { render } from "@testing-library/react";
import { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrollPadding } from "./useScrollPadding.ts";

const Bar: FC<{ side: "top" | "bottom" }> = ({ side }) => {
  const ref = useScrollPadding(side);
  return <div ref={ref} data-testid="bar" />;
};

/** jsdom has no layout, so the bar's height is whatever this says it is. */
const barHeight = (height: number) =>
  vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ height } as DOMRect);

/** A ResizeObserver whose callback the test fires by hand. */
const observers: { fire: () => void; disconnect: ReturnType<typeof vi.fn> }[] =
  [];
const installObserver = () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = vi.fn();
      constructor(callback: () => void) {
        observers.push({ fire: callback, disconnect: this.disconnect });
      }
      observe() {}
    },
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  observers.length = 0;
  document.documentElement.removeAttribute("style");
});

/**
 * What this cannot show is that the browser honours the padding when it
 * scrolls a focused row into view — jsdom does not scroll. That was measured
 * in Chromium at 80 rows and 400px, and is recorded in
 * plans/MANUAL-SWEEP-SPEC-04.md. These pin the half that can regress here:
 * the right property, on the right element, kept in step with the bar.
 */
describe("useScrollPadding", () => {
  it("reserves the bar's height on its own side of the scroller", () => {
    barHeight(100.4);
    render(<Bar side="top" />);
    // Rounded up: a row one fraction of a pixel under the bar is still under it.
    expect(document.documentElement.style.scrollPaddingTop).toBe("101px");
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
  });

  it("reserves the bottom for a bar at the bottom", () => {
    barHeight(57);
    render(<Bar side="bottom" />);
    expect(document.documentElement.style.scrollPaddingBottom).toBe("57px");
    expect(document.documentElement.style.scrollPaddingTop).toBe("");
  });

  it("follows the bar when it grows", () => {
    installObserver();
    const rect = barHeight(57);
    render(<Bar side="bottom" />);

    // The selection toolbar appears inside the action bar.
    rect.mockReturnValue({ height: 132 } as DOMRect);
    observers[0].fire();

    expect(document.documentElement.style.scrollPaddingBottom).toBe("132px");
  });

  it("gives the space back when the bar goes away", () => {
    installObserver();
    barHeight(57);
    const { unmount } = render(<Bar side="bottom" />);

    unmount();

    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
