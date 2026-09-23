import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Dev-only. Serves the layout harness in harness/, deliberately without
 * @crxjs/vite-plugin: that plugin rewrites the manifest and expects an
 * extension build, none of which applies to a page served to a plain browser.
 */
export default defineConfig({
  root: "harness",
  plugins: [react()],
  server: { port: 5200, strictPort: true },
});
