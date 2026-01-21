// Nuclear rebuild: 2026-01-11T17:00:00Z
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // HTTPS habilitado via variável de ambiente VITE_HTTPS=true
    https: process.env.VITE_HTTPS === "true" ? {} : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@modules": path.resolve(__dirname, "./src/modules"),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
}));
