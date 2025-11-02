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
    hmr: {
      port: 5199,
    },
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  }
});
