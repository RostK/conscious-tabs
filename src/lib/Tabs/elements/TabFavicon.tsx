import { PublicOutlined } from "@mui/icons-material";
import { FC, useState } from "react";

import { faviconUrl } from "./favicon.ts";

/**
 * A tab favicon, drawn from the browser's own store — see `favicon.ts` for why
 * that rather than the tab's `favIconUrl`.
 *
 * `browserIcon` is that `favIconUrl`, passed in only so the request changes
 * when Chrome's icon for the page changes. It is never fetched.
 *
 * Falls back to a neutral globe when the browser has no icon for the page or
 * the image fails to load, instead of a broken-image glyph.
 */
export const TabFavicon: FC<{
  pageUrl?: string;
  browserIcon?: string;
  size?: number;
}> = ({ pageUrl, browserIcon, size = 20 }) => {
  /*
   * Which src failed, not whether one did.
   *
   * As a boolean this outlived the thing it described: a row that failed once
   * stayed a globe for as long as the component was mounted, so the icon that
   * arrived a second later was never drawn. Keyed by src, the flag retires by
   * itself the moment there is a different request to try.
   */
  const [failed, setFailed] = useState<string>();
  const src = faviconUrl(pageUrl, size, browserIcon);

  if (!src || failed === src) {
    return <PublicOutlined sx={{ fontSize: size, color: "text.disabled" }} />;
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => {
        setFailed(src);
      }}
    />
  );
};
