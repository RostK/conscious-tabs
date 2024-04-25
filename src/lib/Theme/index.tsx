import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { FC, PropsWithChildren, useMemo } from "react";

export const Theme: FC<PropsWithChildren> = ({ children }) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  console.log(prefersDarkMode);

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
