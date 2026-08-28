import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Client-only SPA build for portable web and single HTML offline.
export default defineConfig({
  root: path.resolve(import.meta.dirname, "spa"),
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-web"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
  },
  server: {
    port: 5174,
    strictPort: false,
  },
});
