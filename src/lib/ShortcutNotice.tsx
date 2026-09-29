import { KeyboardOutlined } from "@mui/icons-material";
import { Alert } from "@mui/material";
import { FC, useEffect, useState } from "react";

import { OPEN_COMMAND } from "./commands.ts";

/**
 * Says so when the keyboard shortcut is not bound to anything.
 *
 * Chrome does not guarantee a suggested key. A chord another extension already
 * holds **fails silently** — no error, no install warning, nothing in the
 * console — and a chord the user cleared themselves looks exactly the same:
 * `commands.getAll()` reports an empty `shortcut` for both. Without this, the
 * product ships a documented shortcut that does nothing, and the only way to
 * find out is to read the README and then go looking at
 * `chrome://extensions/shortcuts`.
 *
 * Three deliberate shapes, each of which was the obvious alternative:
 *
 * - **A strip, not a snackbar.** A three-second toast is one the user may never
 *   see, and this is a standing fact about their install rather than an event.
 *   `FloatClosedNotice` is the precedent, for the same reason.
 * - **Informational, not an error.** An unbound command is not a failure — the
 *   toolbar icon and every other affordance still work, and saying so loudly
 *   would be a defect report for something the user may have chosen.
 * - **Not dismissible.** Remembering a dismissal needs storage, and this
 *   extension writes none (AC-23). Derived from live state instead, so it
 *   disappears the moment the shortcut is bound and needs to remember nothing.
 */
export const ShortcutNotice: FC = () => {
  const [unbound, setUnbound] = useState(false);

  useEffect(() => {
    // Guarded rather than assumed: a document rendered somewhere without the
    // commands API must not throw on the way to showing a tab list.
    if (!chrome.commands?.getAll) return;
    let live = true;
    void chrome.commands.getAll().then((commands) => {
      const ours = commands.find(({ name }) => name === OPEN_COMMAND);
      if (live) setUnbound(Boolean(ours) && !ours?.shortcut);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!unbound) return null;

  return (
    <Alert
      severity="info"
      // MUI defaults an Alert to `role="alert"`, which is an *assertive* live
      // region: it interrupts whatever a screen reader is saying. Right for
      // "couldn't open the side panel"; wrong for a standing fact about the
      // user's install that appears as the surface loads. Polite still
      // announces it — this renders after `getAll()` resolves, so it is a
      // genuine addition to the page — without talking over anything.
      role="status"
      icon={<KeyboardOutlined fontSize="inherit" />}
      sx={{ borderRadius: 0, alignItems: "center" }}
    >
      No keyboard shortcut is set for opening Conscious Tabs. Assign one at
      chrome://extensions/shortcuts.
    </Alert>
  );
};
