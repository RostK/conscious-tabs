import { VolumeOff, VolumeUp } from "@mui/icons-material";
import { Badge } from "@mui/material";
import { FC, PropsWithChildren } from "react";

/**
 * A small speaker overlay for a tab's favicon: red when the tab is making
 * sound, greyed when it is muted, absent otherwise. Shared by the current-tab
 * row and the tab list so both read the same at a glance.
 *
 * The cue, not the control: the row it marks carries its own mute button, and
 * the toolbar's AudioTabs menu acts on every noisy tab at once.
 */
export const AudioBadge: FC<
  PropsWithChildren<{ audible?: boolean; muted?: boolean; size?: number }>
> = ({ audible, muted, size = 15, children }) => (
  <Badge
    overlap="circular"
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    invisible={!(muted || audible)}
    badgeContent={
      muted ? (
        <VolumeOff sx={{ fontSize: size * 0.8 }} />
      ) : (
        <VolumeUp sx={{ fontSize: size * 0.8 }} />
      )
    }
    sx={{
      "& .MuiBadge-badge": {
        minWidth: 0,
        width: size,
        height: size,
        p: 0,
        borderRadius: "50%",
        bgcolor: "background.paper",
        color: muted ? "text.disabled" : "error.main",
        boxShadow: (theme) => `0 0 0 1.5px ${theme.palette.background.paper}`,
      },
    }}
  >
    {children}
  </Badge>
);
