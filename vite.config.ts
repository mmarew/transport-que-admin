import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_API_BASE_URL;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: {
      sourcemap: process.env.NODE_ENV !== "production",
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
                return "vendor";
              }
              if (id.includes("@reduxjs") || id.includes("react-redux") || id.includes("zustand")) {
                return "redux";
              }
              if (id.includes("lucide-react")) {
                return "icons";
              }
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      ...(backendUrl
        ? {
            proxy: {
              "/api": {
                target: backendUrl,
                changeOrigin: true,
              },
              "/socket.io": {
                target: backendUrl,
                changeOrigin: true,
                ws: true,
              },
            },
          }
        : {}),
    },
  };
});