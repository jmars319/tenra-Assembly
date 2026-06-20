import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error Vite config runs in Node while this app keeps browser-only ambient types.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],

  // Keep Tauri's dev server predictable so Rust errors stay visible and devUrl remains stable.
  clearScreen: false,
  server: {
    fs: {
      allow: ["../.."],
    },
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // src-tauri changes are handled by Tauri; Vite watching them creates duplicate rebuild churn.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
