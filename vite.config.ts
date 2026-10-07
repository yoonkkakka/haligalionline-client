import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  // GitHub Pages serves this repo as a project site at
  // https://yoonkkakka.github.io/haligalionline-client/, not at the domain
  // root, so the production build's asset URLs need that path prefix.
  // Local dev keeps the root path so http://localhost:5173/ still works.
  base: mode === "production" ? "/haligalionline-client/" : "/",
  server: {
    port: 5173,
  },
}));
