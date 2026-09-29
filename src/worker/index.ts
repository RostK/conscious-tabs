// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// The manifest declares this worker `"type": "module"` and Vite bundles it as
// one, but TypeScript decides that from the file's own syntax: with no import
// and no export it is a global script, and `await import("./index.ts")` from a
// test fails to compile — while the suite passes, because Vitest does not
// type-check. This is the seam that makes the worker reachable from a test at
// all, and it becomes redundant the moment this file imports anything.
export {};
