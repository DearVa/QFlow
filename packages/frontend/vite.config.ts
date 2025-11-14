import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: "@packages/shared",
        replacement: path.resolve(__dirname, "../packages/shared"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  server: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true
      },
      '/stream': {
        target: 'ws://127.0.0.1:8081',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
