# 專案進度

最後更新：2026-10-07

## 開發步驟

- [x] 1. 建專案骨架：Vite + PWA 空白 App、圖示、Prettier 自動排版 hook、部署 workflow、`CLAUDE.md`
- [x] 2. 上線：`git init`、建 public repo `pyondudu/draw-helper`、push 後自動部署，手機打開確認（https://pyondudu.github.io/draw-helper/ ）
- [x] 3. 讀資料和解析
  - [x] 3a. `src/parse.js` + 假資料範例檔 + `npm run check`：兩種格式都能讀，兩個固定版本的筆數完全相符
  - [x] 3b. 畫面：打開自動讀取、顯示讀取時間和筆數、「資料讀取失敗」+「打開原頁面」按鈕（抽選資料不可離線快取）
- [x] 4. 門市對照表（`src/stores.js`）和款式整理（`src/products.js`），已用兩輪真實資料驗證（畫面在第 5 步）
- [x] 5. 首頁和設定
  - [x] 5a. 設定頁（`#settings`）：門市範圍、想要的款式、「新」款式標示（設定存 localStorage）
  - [x] 5b. 首頁：這一輪狀態、「共 N 筆要抽，已抽 M 筆」、每個想要的款式「已抽幾家／共幾家」
- [ ] 6. 連續抽選、清單模式、抽中之後（第五、六節）
- [ ] 7. 建 `/phone-test` skill，Android + iPhone 實測（第九節驗收清單）

## 以後再考慮（第一版不做）

見需求說明第十節。
