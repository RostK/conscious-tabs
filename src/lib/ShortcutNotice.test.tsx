import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../test/chromeStub.ts";
import { ShortcutNotice } from "./ShortcutNotice.tsx";

const SHORTCUTS_PAGE = /chrome:\/\/extensions\/shortcuts/;

beforeEach(() => {
  installChrome();
});

/**
 * A chord another extension already holds fails silently — no error, no
 * warning, nothing in the console — and looks identical to one the user
 * cleared. Both report an empty `shortcut`, so one notice covers both, and
 * without it the product documents a key that does nothing.
 */
describe("the unbound-shortcut notice", () => {
  it("says so, and says where to fix it", async () => {
    installChrome({ commands: [{ name: "open-conscious-tabs", shortcut: "" }] });

    render(<ShortcutNotice />);

    expect(await screen.findByText(SHORTCUTS_PAGE)).toBeInTheDocument();
  });

  // The ordinary state is a bound shortcut, and the ordinary state says
  // nothing at all.
  it("stays quiet when the shortcut is bound", async () => {
    const { container } = render(<ShortcutNotice />);

    await waitFor(() => expect(chrome.commands.getAll).toHaveBeenCalled());

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * AC-7: an unbound command is not a failure state. The toolbar icon and
   * every other affordance still work, so this is information rather than an
   * error — an `alert` role would put it in the same class as "couldn't open
   * the side panel", which it is not.
   */
  it("is information, not an error", async () => {
    installChrome({ commands: [{ name: "open-conscious-tabs", shortcut: "" }] });

    render(<ShortcutNotice />);

    await screen.findByText(SHORTCUTS_PAGE);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // A document without the commands API must not throw on its way to showing
  // a tab list.
  it("survives a context with no commands API", async () => {
    const chrome = installChrome();
    delete (chrome as Partial<typeof chrome>).commands;

    const { container } = render(<ShortcutNotice />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
