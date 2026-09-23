import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AudioBadge } from "./AudioBadge.tsx";

/**
 * The cue, on its own. SPEC-02 AC-1 … AC-3.
 *
 * The badge is the only thing that says which row is making the sound, and it
 * is shared by the list and the current-tab card — so it is worth pinning
 * directly rather than through whichever surface happens to render it.
 */
describe("the audio cue", () => {
  const badgeOf = (container: HTMLElement) =>
    container.querySelector(".MuiBadge-badge") as HTMLElement;

  const icon = (el: HTMLElement) =>
    el.querySelector("svg")?.getAttribute("data-testid");

  it("shows a speaker while the tab is audible", () => {
    const { container } = render(
      <AudioBadge audible>
        <span />
      </AudioBadge>,
    );

    expect(badgeOf(container)).not.toHaveClass("MuiBadge-invisible");
    expect(icon(badgeOf(container))).toBe("VolumeUpIcon");
  });

  // A muted tab reports audible: false, so muted alone has to raise the cue.
  it("shows a muted speaker while the tab is muted and silent", () => {
    const { container } = render(
      <AudioBadge audible={false} muted>
        <span />
      </AudioBadge>,
    );

    expect(badgeOf(container)).not.toHaveClass("MuiBadge-invisible");
    expect(icon(badgeOf(container))).toBe("VolumeOffIcon");
  });

  it("shows nothing when the tab is neither", () => {
    const { container } = render(
      <AudioBadge>
        <span />
      </AudioBadge>,
    );

    expect(badgeOf(container)).toHaveClass("MuiBadge-invisible");
  });
});
