import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import { installChrome } from "./chromeStub.ts";

// Must happen before any module under test is imported: two modules read
// chrome.* at module scope and throw on import without it. See chromeStub.ts.
installChrome();

// jsdom has no matchMedia. Both the theme (via MUI's useMediaQuery) and the
// float's canvas colour ask for the system colour scheme, so without this they
// throw rather than simply reading as light.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  // A clean baseline per test, so a fixture set by one never leaks into the
  // next. Tests that need data call installChrome() again with fixtures.
  installChrome();
  // Reset the URL too — getHost() reads location.search, and a test that sets
  // ?host=float would otherwise change the surface every later test runs in.
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
});
