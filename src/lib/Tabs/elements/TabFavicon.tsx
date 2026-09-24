import { PublicOutlined } from "@mui/icons-material";
import { FC, useState } from "react";

import { faviconUrl } from "./favicon.ts";

/**
 * A tab favicon, drawn from the browser's own store — see `favicon.ts` for why
 * that rather than the tab's `favIconUrl`.
 *
 * Falls back to a neutral globe when the browser has no icon for the page or
 * the image fails to load, instead of a broken-image glyph. Pass a stable `key`
 * (the page url) so the error state resets per tab.
 */
export const TabFavicon: FC<{ pageUrl?: string; size?: number }> = ({
  pageUrl,
  size = 20,
}) => {
  const [broken, setBroken] = useState(false);
  const src = faviconUrl(pageUrl, size);
  if (!src || broken) {
    return <PublicOutlined sx={{ fontSize: size, color: "text.disabled" }} />;
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  );
};
