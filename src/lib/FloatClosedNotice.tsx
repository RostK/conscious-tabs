import { Close, PictureInPictureAlt } from "@mui/icons-material";
import { Alert, Box, Button, IconButton } from "@mui/material";
import { FC, useSyncExternalStore } from "react";

import {
  acknowledgeFloatClosed,
  getFloatState,
  openFloat,
  subscribeFloat,
} from "./float.ts";
import { getHost } from "./host.ts";

/**
 * Shown in the anchor tab when the float went away without us asking.
 *
 * Deliberately a persistent strip rather than a snackbar: the float exists so
 * the user can be in another application, so by the time they notice it has
 * gone, a toast that expired after three seconds is a toast nobody saw.
 *
 * Chrome tells us nothing about *why* it closed, and this copy does not
 * pretend otherwise — it names what happened and offers the most likely cause
 * as a possibility, because "one picture-in-picture window at a time" is the
 * rule the user just ran into without being told it existed.
 */
export const FloatClosedNotice: FC = () => {
  const state = useSyncExternalStore(subscribeFloat, getFloatState);

  if (getHost() !== "anchor" || state !== "wasClosed") {
    return null;
  }

  return (
    <Alert
      severity="info"
      icon={<PictureInPictureAlt fontSize="inherit" />}
      sx={{ borderRadius: 0, alignItems: "center" }}
      action={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<PictureInPictureAlt />}
            // Direct handler, nothing awaited: requestWindow() spends this
            // click's transient activation and there is no second chance.
            onClick={openFloat}
          >
            Float again
          </Button>
          <IconButton
            size="small"
            color="inherit"
            aria-label="Dismiss"
            onClick={acknowledgeFloatClosed}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      The floating window closed. Chrome allows one picture-in-picture window
      at a time, so opening another closes this one.
    </Alert>
  );
};
