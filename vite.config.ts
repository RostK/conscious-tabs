import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import manifest from "./manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as ManifestV3Export })],

  server: {
    port: 5199,
    strictPort: true,
    // Vite 6/7 tightened dev-server CORS; allow the extension's
    // chrome-extension:// origin to fetch the CRXJS HMR client worker.
    cors: {
      origin: [/^chrome-extension:\/\//],
    },
    hmr: {
      port: 5199,
    },
  },
  build: {
    // 550 kB raw / 176 kB gzip, and the 500 kB warning was firing on every
    // build — which teaches people to ignore warnings rather than read them.
    // Measured once, by chunking per package (2026-09-24):
    //
    //   @mui/material 161 · react-dom 131 · our own code 43 · @dnd-kit/core 38
    //   @mui/system 32 · react-hook-form 24 · notistack 23 · @popperjs/core 20
    //   @mui/base 15 · @mui/icons-material 6      (kB, raw)
    //
    // There is no dead weight in that list. The icons tree-shake to 6 kB, so
    // the barrel imports are not the problem people usually assume; the rest
    // is the framework the UI is made of. Splitting it would silence the
    // warning and change nothing measurable — an extension loads every chunk
    // from local disk at startup and parses all of them either way. The only
    // real deferral available is the group dialog (react-hook-form plus MUI's
    // Dialog, about 6% of the bundle), which is not worth a Suspense boundary
    // for a dialog opened from a toolbar button.
    chunkSizeWarningLimit: 600,
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
});
