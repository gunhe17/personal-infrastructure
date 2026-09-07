import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 데몬이 dist/ 를 /ui 에서 준다. dev 서버는 API 만 데몬(7878)으로 넘긴다.
export default defineConfig({
  base: "/ui/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": "/src" } },
  server: {
    proxy: {
      "^/(health|status|doctor|projects|deployments|domains|certificates|git|webhooks|hooks|databases|backups|credentials|volumes|notifications|settings|tokens|audit|analytics|jobs|edge|tunnel|migration|mail|system|issues|mcp)(/|$|\\?)": "http://127.0.0.1:7878",
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
