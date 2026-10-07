// 讀取原作者的抽選清單。每次都從網路讀，不用任何快取。
import { parseDrawHtml, summarize } from "./parse.js";

export const SOURCE_PAGE = "https://uxux11.github.io/funbox-line/";
const SOURCE_FILE =
  "https://raw.githubusercontent.com/UXUX11/funbox-line/main/index.html";

const LAST_READ_KEY = "draw-helper:lastRead";

// 這一輪的日期：各門市抽選時間裡最常出現的日期（頁面標題常是狀態文字，不能用）
function roundDate(stores) {
  const count = new Map();
  for (const s of stores) {
    if (s.date) count.set(s.date, (count.get(s.date) ?? 0) + 1);
  }
  let best = null;
  for (const [date, n] of count) {
    if (!best || n > count.get(best) || (n === count.get(best) && date > best))
      best = date;
  }
  return best;
}

function loadLastRead() {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY));
  } catch {
    return null;
  }
}

function saveLastRead(value) {
  try {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(value));
  } catch {
    // 私密模式等存不了的情況，下次就不顯示「比上次多幾筆」
  }
}

// 成功：{ ok: true, stores, summary, round, readAt, previous }
// 失敗：{ ok: false, reason }
export async function loadDraws() {
  let html;
  try {
    const res = await fetch(SOURCE_FILE, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, reason: `伺服器回應 ${res.status}` };
    html = await res.text();
  } catch {
    return { ok: false, reason: "連不上網路或來源" };
  }

  const { stores } = parseDrawHtml(html);
  const summary = summarize(stores);
  // 解析出 0 筆也算失敗：可能是原作者改版，不能讓人以為這輪沒有抽選
  if (summary.links === 0) {
    return { ok: false, reason: "讀到檔案，但解析不出任何抽選連結" };
  }

  const round = roundDate(stores);
  const readAt = Date.now();
  const previous = loadLastRead();
  saveLastRead({ round, links: summary.uniqueLinks, readAt });
  return { ok: true, stores, summary, round, readAt, previous };
}
