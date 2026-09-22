import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import { installChrome } from "./chromeStub.ts";

// Must happen before any module under test is imported: two modules read
// chrome.* at module scope and throw on import without it. See chromeStub.ts.
installChrome();

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
