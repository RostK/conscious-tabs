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
/**
 * A short, stable stand-in for a long icon URL.
 *
 * `favIconUrl` is often a `data:` URL running to kilobytes, and it goes into a
 * query string here, so it is hashed rather than carried. djb2: not a security
 * primitive and not used as one — the only question asked of it is "is this
 * different from last time".
 */
const token = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
};

export const faviconUrl = (
  pageUrl: string | undefined,
  size: number,
  browserIcon?: string,
): string | undefined => {
  if (!pageUrl) return undefined;
  const endpoint = new URL(chrome.runtime.getURL("/_favicon/"));
  endpoint.searchParams.set("pageUrl", pageUrl);
  // Twice the drawn size: asking for exactly the CSS pixels would hand a 2x
  // display a blurrier icon than the remote one this replaced, making a privacy
  // win look like a downgrade (SPEC-03 AC-2).
  endpoint.searchParams.set("size", String(size * 2));
  /*
   * The cache key, and the reason this parameter exists.
   *
   * `_favicon` is keyed by page URL, and a page URL stops changing the moment
   * a navigation settles. A tab navigated a second ago asks for an icon Chrome
   * has not catalogued yet, gets the default globe, and the browser caches
   * that answer against this exact request URL — so when Chrome acquires the
   * real icon a moment later, nothing here changes and the row keeps the
   * globe. Varying the URL with the site's own icon is what makes the second
   * answer a different request.
   *
   * The value is a hash of `favIconUrl` and that URL is never fetched: this is
   * a change signal, not a source. Fetching it is what SPEC-03 removed.
   */
  if (browserIcon) endpoint.searchParams.set("v", token(browserIcon));
  return endpoint.toString();
};
