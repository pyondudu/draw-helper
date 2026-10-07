import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // 相對路徑，部署到 GitHub Pages 的子路徑也能用
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "抽選小幫手",
        short_name: "抽選",
        description: "依開抽時間，把每家門市的 LINE 抽選一筆筆抽完",
        lang: "zh-TW",
        display: "standalone",
        theme_color: "#111418",
        background_color: "#111418",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // 只快取 App 本身的檔案；抽選資料是跨網域讀取，不會被這裡快取
        globPatterns: ["**/*.{js,css,html,png}"],
      },
    }),
  ],
});
