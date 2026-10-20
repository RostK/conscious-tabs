import { act, renderHook } from "@testing-library/react";
import { PropsWithChildren, useContext } from "react";
import { describe, expect, it, vi } from "vitest";

import { SelectionContext, SelectionProvider } from "./SelectionContext.tsx";

const wrapper = ({ children }: PropsWithChildren) => (
  <SelectionProvider>{children}</SelectionProvider>
);

describe("telling the other surfaces about a selection", () => {
  /**
   * With one surface open, nobody is listening, and Chrome rejects the send.
   * Uncaught, that was an "Uncaught (in promise)" in the console on every
   * tick of a checkbox.
   *
   * The send is a plain function, not a `vi.fn`: a mock records how the
   * promise it returned settled, which attaches a handler, so its rejection is
   * never unhandled and this test passed without the fix.
   */
  it("stays quiet when no other surface is open to hear it", async () => {
    const sent: unknown[] = [];
    chrome.runtime.sendMessage = ((message: unknown) => {
      sent.push(message);
      return Promise.reject(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );
    }) as typeof chrome.runtime.sendMessage;
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const { result } = renderHook(() => useContext(SelectionContext), {
      wrapper,
    });

    act(() => {
      result.current.dispatch({ type: "switch", data: 3 });
    });
    // Long enough for Node to report a rejection nobody handled.
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
    expect(result.current.selected).toEqual([3]);
    expect(sent).toEqual([{ type: "selection", payload: [3] }]);
  });
});
