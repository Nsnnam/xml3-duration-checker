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
      "node:fs": path.resolve(import.meta.dirname, "src/lib/empty-node-mock.ts"),
      "node:https": path.resolve(import.meta.dirname, "src/lib/empty-node-mock.ts"),
      fs: path.resolve(import.meta.dirname, "src/lib/empty-node-mock.ts"),
      https: path.resolve(import.meta.dirname, "src/lib/empty-node-mock.ts"),
    },
  },
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-web"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5174,
    strictPort: false,
  },
});
