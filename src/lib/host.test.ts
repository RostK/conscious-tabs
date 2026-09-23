import { describe, expect, it } from "vitest";

import { getHost } from "./host.ts";

const hostAt = (search: string) => {
  window.history.replaceState(null, "", search);
  return getHost();
};

describe("getHost", () => {
  it("recognises the anchor tab", () => {
    expect(hostAt("/?host=anchor")).toBe("anchor");
  });

  it("recognises the float", () => {
    expect(hostAt("/?host=float")).toBe("float");
  });

  it("treats a bare document as the side panel", () => {
    expect(hostAt("/")).toBe("panel");
  });

  // AC-28: an unrecognised host falls back to panel behaviour rather than
  // enabling any other surface's affordances.
  it.each([
    ["the superseded popup host", "/?host=window"],
    ["an unknown surface", "/?host=sidebar"],
    ["an empty value", "/?host="],
    ["markup", "/?host=%3Cscript%3E"],
    ["a different parameter entirely", "/?surface=float"],
  ])("falls back to the panel for %s", (_label, search) => {
    expect(hostAt(search)).toBe("panel");
  });
});
