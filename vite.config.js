import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const htmlProxyCompat = () => ({
  name: "html-proxy-compat",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const rawUrl = String(req.url || "");
      if (!rawUrl.startsWith("/index.html?html-proxy")) return next();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.end('import "/src/tawk-chat-loader.js";');
    });
  }
});

export default defineConfig({
  plugins: [react(), htmlProxyCompat()],
  server: {
    port: 5000,
    strictPort: true,
    host: "0.0.0.0"
  }
});
