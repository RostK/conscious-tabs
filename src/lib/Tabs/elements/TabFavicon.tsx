import { PublicOutlined } from "@mui/icons-material";
import { FC, useState } from "react";

/**
 * A tab favicon that falls back to a neutral globe when the tab has no icon or
 * the image fails to load (e.g. chrome:// pages), instead of a broken-image
 * glyph. Pass a stable `key` (the src) so the error state resets per tab.
 */
export const TabFavicon: FC<{ src?: string; size?: number }> = ({
  src,
  size = 20,
}) => {
  const [broken, setBroken] = useState(false);
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
