// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import demo from "./dev/demo.js";

export default defineConfig(({ command, isPreview }) => ({
  base: "/proyecto-estaca-villa-mella/",
  plugins: [react(), ...(command === "serve" && !isPreview ? [demo()] : [])],
}));
