import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { FC, PropsWithChildren, useMemo } from "react";

import { dark, light } from "./brand.ts";

export const Theme: FC<PropsWithChildren> = ({ children }) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(
    () => {
      // Conscious brand palette (plum accent on warm paper). The tab list
      // stays sans for scannability; the serif face is reserved for brand
      // moments and applied per-component (see brand.ts / CurrentTab).
      const c = prefersDarkMode ? dark : light;
      return createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
          // The Conscious app uses ink/black as the interactive accent (plum
          // is reserved for the logo). On dark, "ink" inverts to a paper tone.
          primary: {
            main: c.ink,
            contrastText: c.onInk,
          },
          background: {
            default: c.canvas,
            paper: c.card,
          },
          text: {
            primary: c.ink,
            secondary: c.muted,
          },
          divider: c.rule,
        },
        // Rounded, friendly cards like the app (not the site's sharp 0px).
        shape: {
          borderRadius: 8,
        },
        typography: {
          fontSize: 12,
          button: {
            textTransform: "none",
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              startIcon: {
                marginRight: "2px",
              },
            },
          },
          // Don't lock body scroll / compensate the scrollbar when a menu or
          // popover opens — in the narrow side panel that shifts the content
          // and leaves a gap by the scrollbar.
          MuiMenu: {
            defaultProps: {
              disableScrollLock: true,
            },
          },
          MuiPopover: {
            defaultProps: {
              disableScrollLock: true,
            },
          },
        },
      });
    },
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
};
