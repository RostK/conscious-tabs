import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { FC, PropsWithChildren, useMemo } from "react";

export const Theme: FC<PropsWithChildren> = ({ children }) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
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
      }),
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
};
