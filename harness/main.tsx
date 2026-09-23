import "../src/index.css";

import { installFakeChrome } from "./fakeChrome.ts";

/**
 * Renders the real App against fake tab data, so its layout can be measured at
 * the float's size without an extension or a Picture-in-Picture window.
 *
 * The chrome stand-in has to be installed *before* the app's modules are
 * evaluated: useTabsStructure reads chrome.tabGroups.TAB_GROUP_ID_NONE and
 * SyncPrompt reads chrome.sessions.MAX_SESSION_RESULTS, both at module scope,
 * and either throws on import without it. Hence the dynamic imports.
 */
installFakeChrome();

const [{ default: React }, { createRoot }, { default: App }, { Theme }] =
  await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("../src/App.tsx"),
    import("../src/lib/Theme/index.tsx"),
  ]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme>
      <App />
    </Theme>
  </React.StrictMode>,
);
