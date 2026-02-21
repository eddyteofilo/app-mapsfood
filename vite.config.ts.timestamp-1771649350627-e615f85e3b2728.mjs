// vite.config.ts
import { defineConfig } from "file:///C:/Users/Eddy%20Teofilo/Desktop/Nova%20pasta/pizza-dash-map-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Eddy%20Teofilo/Desktop/Nova%20pasta/pizza-dash-map-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Eddy Teofilo\\Desktop\\Nova pasta\\pizza-dash-map-main";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false
  },
  plugins: [
    react()
    // Desabilitando tagger em dev para ganho de performance no reload
    // mode === "development" && componentTagger() 
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  optimizeDeps: {
    include: ["react-leaflet", "leaflet", "lucide-react", "recharts"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFZGR5IFRlb2ZpbG9cXFxcRGVza3RvcFxcXFxOb3ZhIHBhc3RhXFxcXHBpenphLWRhc2gtbWFwLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEVkZHkgVGVvZmlsb1xcXFxEZXNrdG9wXFxcXE5vdmEgcGFzdGFcXFxccGl6emEtZGFzaC1tYXAtbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRWRkeSUyMFRlb2ZpbG8vRGVza3RvcC9Ob3ZhJTIwcGFzdGEvcGl6emEtZGFzaC1tYXAtbWFpbi92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgLy8gRGVzYWJpbGl0YW5kbyB0YWdnZXIgZW0gZGV2IHBhcmEgZ2FuaG8gZGUgcGVyZm9ybWFuY2Ugbm8gcmVsb2FkXG4gICAgLy8gbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpIFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3JlYWN0LWxlYWZsZXQnLCAnbGVhZmxldCcsICdsdWNpZGUtcmVhY3QnLCAncmVjaGFydHMnXSxcbiAgfVxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzWCxTQUFTLG9CQUFvQjtBQUNuWixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBO0FBQUEsRUFHUixFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxpQkFBaUIsV0FBVyxnQkFBZ0IsVUFBVTtBQUFBLEVBQ2xFO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
