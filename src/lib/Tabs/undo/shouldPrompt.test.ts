import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldPrompt } from "./shouldPrompt.ts";

const atHost = (host?: string) => {
  window.history.replaceState(null, "", host ? `/?host=${host}` : "/");
};

/** jsdom's document.hidden is read-only, so it has to be stubbed. */
const setHidden = (hidden: boolean) => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
};

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * AC-19. SyncPrompt subscribes in every live document, so without this one
 * closed tab raised a prompt in each open surface — and pressing UNDO in two
 * of them restored twice, which is a duplicated operation, not just a
 * duplicated toast.
 */
describe("shouldPrompt", () => {
  it("prompts in the side panel when it is visible", () => {
    atHost();
    setHidden(false);
    expect(shouldPrompt()).toBe(true);
  });

  it("prompts in the float", () => {
    atHost("float");
    setHidden(false);
    expect(shouldPrompt()).toBe(true);
  });

  it("prompts in the anchor tab while no float is up", () => {
    atHost("anchor");
    setHidden(false);
    expect(shouldPrompt()).toBe(true);
  });

  it("stays quiet in a document nobody is looking at", () => {
    atHost("anchor");
    setHidden(true);
    expect(shouldPrompt()).toBe(false);
  });

  // The case this unit exists for. The anchor keeps rendering behind its
  // float; the float is the surface the user went to the trouble of opening.
  it("defers to the float from the anchor tab that is holding it", async () => {
    atHost("anchor");
    setHidden(false);

    const float = await import("../../float.ts");
    vi.spyOn(float, "getFloatState").mockReturnValue("open");

    expect(shouldPrompt()).toBe(false);
  });

  // Not hasFocus(): closing a tab from Chrome's own tab strip leaves none of
  // our documents focused, and that is exactly when undo is most wanted.
  it("still prompts when the user closed the tab from Chrome's tab strip", () => {
    atHost();
    setHidden(false);
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    expect(shouldPrompt()).toBe(true);
  });
});
