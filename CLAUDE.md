# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 目前進度（每次對話開始必讀）

@PROGRESS.md

- 每次新對話的第一個回覆，先用 3～5 行提醒使用者「目前進度」和「下一步」（依 PROGRESS.md），再處理使用者的請求。
- 完成某個步驟後，要更新 PROGRESS.md（勾選完成的項目、改「最後更新」日期）。

## 專案目標

手機用的 PWA，讀取原作者整理的全台 Funbox 門市 LINE 抽選清單（https://uxux11.github.io/funbox-line/ ），幫使用者「抽得多」（想要的款式每家店都抽到）和「抽得早」（依開抽時間排序，一筆接一筆抽完）。只供自己使用。

完整需求在 `抽選小幫手_需求說明.md`，做每個功能前先讀對應章節（資料解析看第八節，驗收看第九節）。

## 部署

- 預定網址：https://pyondudu.github.io/draw-helper/ （repo：https://github.com/pyondudu/draw-helper ，**public**）
- push 到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並部署（約 1 分鐘），可用 `gh run watch` 確認。
- repo 是公開的：不能放任何個人資料。commit 前用 `git status` 確認。
- git 身分：名字 `Forever1407`、email 用 GitHub noreply 地址（不公開使用者的 Gmail）。

## 指令

- `npm run dev`：開發 server（VM 是 NAT，手機連不到，實機測試用 GitHub Pages）
- `npm run build` / `npm run preview`：正式版建置與預覽
- `npm run check`（`scripts/check.mjs`）：驗證解析（`src/parse.js`）、門市對照表（`src/stores.js`）、款式整理（`src/products.js`）。先測假資料和手寫案例，再連網比對原作者兩個固定版本。改這三個檔案後一定要跑，並把新遇到的寫法加進測試案例。
- `node scripts/make-icons.mjs`：重新產生 `public/` 的 PWA 圖示

## 架構與硬性規則

- Vite + 原生 JavaScript（不用框架），npm 管理套件。
- **不把原作者的資料存進 repo**：每次使用時才 `fetch`。測試腳本可以讀固定版本，但不能存檔；離線測試用自己手寫的假門市範例檔。
- **抽選資料不可以被離線快取**（service worker 只快取 App 本身）。讀不到或解析出 0 筆時，要顯示「資料讀取失敗」和「打開原頁面」按鈕，**不可以顯示空清單**。
- 原作者的 HTML 用 `DOMParser` 解析（`src/parse.js` 的 `parseDrawHtml`；Node 測試時傳入 `linkedom` 的 DOMParser），文字一律用 `textContent`，**不要用 innerHTML**。連結只接受 `https://lin.ee/` 或 `https://line.me/` 開頭，只讀 `.draw-list` 裡的內容。
- 款式以型號分組（`identifyProduct` 的 key，例如 `UX-19`、`CX-00:新世紀福音戰士`、`其他:超人力霸王聯名款`），這個 key 也用來跨輪記住勾選，改格式會讓使用者的勾選失效。-00 型號靠 `ZERO_ALIASES` 依名稱分開，店家寫錯型號靠 `NAME_FIXES` 更正，遇到新案例要補進去。
- 使用者的設定和紀錄只存 localStorage，不上傳、不登入。
- 打開 LINE 抽選只用使用者點擊的 `<a href target="_blank" rel="noopener">`，不用程式自動跳轉。不代替使用者送出抽選、不自動加好友。
- 畫面底部要註明資料來源並附原頁面連結。

## 必須同時支援 Android Chrome 與 iOS Safari

- 加到主畫面後的版本都要實測：能跳到 LINE，回到 App 時畫面停在原本的位置。
- Android 移除 App 後重新安裝，可能出現「無法開啟應用程式」或只能加成 Chrome 捷徑（2026-10-07 遇過）：重開機無效，要 Chrome ⋮ → 設定 → 網站設定 → 所有網站 → `pyondudu.github.io` →「清除並重設」才能重裝。這也會清掉 App 的設定與抽選紀錄，要先提醒使用者。
- 開發機是 **VMware 虛擬機（NAT 網路）**：手機無法用區網 IP 連到 dev server，實機測試要用部署到 GitHub Pages 後的網址。

## 與使用者協作

- 使用者是程式新手：每次說明要一步步來，包含要執行的指令、在哪裡執行、預期看到什麼。
- 需要輸入密碼或互動選擇的指令（`sudo`、`gh auth login`）**不能用 `! 指令`**（拿不到終端機），要請使用者另開終端機（`Ctrl+Alt+T`）執行。
