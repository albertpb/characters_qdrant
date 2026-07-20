import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/character-api": {
          target: env.VITE_CHARACTER_API_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/character-api/, ""),
        },
        "/lm-studio": {
          target: env.VITE_LM_STUDIO_URL || "http://127.0.0.1:1234",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/lm-studio/, ""),
        },
      },
    },
  };
});
