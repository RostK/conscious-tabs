import { handleCommand } from "./openSurface.ts";

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

/*
 * The keyboard way in, kept distinct from the icon above on purpose.
 *
 * `_execute_action` would have reused that path and looked simpler, but a
 * reserved command dispatches no `onCommand` event at all — so there would be
 * no listener, and no way to decide which surface to open or to leave an open
 * one alone. The handler lives in its own module so a test can both call it
 * and read it: AC-36 is verified partly by reading the source, because what it
 * forbids is an ordering that no assertion about the result can see.
 */
chrome.commands.onCommand.addListener(handleCommand);
