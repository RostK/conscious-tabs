import "./index.css";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";

const theme = createTheme({
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
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
