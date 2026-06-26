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
  legacy: {
    skipWebSocketTokenCheck: true,
  }
});
