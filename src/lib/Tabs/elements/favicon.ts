/**
 * A tab's icon, read from the browser's own favicon store.
 *
 * The obvious source is `chrome.tabs.Tab.favIconUrl`, and it is what this used
 * to be. For almost every ordinary tab that is a *remote* URL, so drawing the
 * list issued a request to each listed site — forty tabs, forty origins that
 * could observe that someone had opened a tab manager. Nothing identifying went
 * with it, and `PRIVACY.md` said so honestly, but the requests were real and
 * they were avoidable.
 *
 * `_favicon` serves the same pictures from the database Chrome already built
 * while the user browsed: no network, no origin contacted, and an answer for
 * pages whose icon cannot be fetched at all — `chrome://` especially, which
 * used to be an indistinguishable row of grey globes. It costs the `favicon`
 * permission (SPEC-03 AC-6).
 *
 * Built through `URL` rather than string concatenation on purpose: a tab's URL
 * is attacker-influenced and routinely contains `&` and `#`, either of which
 * silently truncates a hand-joined query (SPEC-03 E-6).
 */
export const faviconUrl = (
  pageUrl: string | undefined,
  size: number,
): string | undefined => {
  if (!pageUrl) return undefined;
  const endpoint = new URL(chrome.runtime.getURL("/_favicon/"));
  endpoint.searchParams.set("pageUrl", pageUrl);
  // Twice the drawn size: asking for exactly the CSS pixels would hand a 2x
  // display a blurrier icon than the remote one this replaced, making a privacy
  // win look like a downgrade (SPEC-03 AC-2).
  endpoint.searchParams.set("size", String(size * 2));
  return endpoint.toString();
};
