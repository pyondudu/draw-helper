// 解析原作者頁面（funbox-line）的抽選清單。
// 只讀 .draw-list 裡的內容；文字一律用 textContent，不執行對方的程式。

const ALLOWED_LINK = /^https:\/\/(lin\.ee|line\.me)\//;

// 日期後面接著時間或「開店」，例如「2026/10/02 11:00」「2026/10/02 開店」
const DATE_TIME = /(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s*(\d{1,2}:\d{2}|開店))?/;

// 舊格式商品名稱後面的價格，例如「（$295）」
const PRICE = /\s*[（(]\s*\$\s*[\d,]+\s*[)）]\s*$/;

function text(el) {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// 從「抽選時間：…」文字讀出開抽日期和時間（time 為 null 代表未註明）
export function parseStartText(startText) {
  const m = startText.normalize("NFKC").match(DATE_TIME);
  if (!m) return { date: null, time: null };
  const [, y, mo, d, t] = m;
  const time = t && t !== "開店" ? t.padStart(5, "0") : (t ?? null);
  return { date: `${y}/${pad(mo)}/${pad(d)}`, time };
}

function parseStore(storeEl) {
  const startText = text(storeEl.querySelector(".draw-start"));
  const fromText = parseStartText(startText);
  // 現行格式有 data-draw-start-time（空字串 = 未註明）；舊格式要從文字讀
  const attr = storeEl.getAttribute("data-draw-start-time");
  const startTime = attr === null ? fromText.time : attr.trim() || null;

  const items = [];
  let rejected = 0;
  for (const itemEl of storeEl.querySelectorAll(".draw-item")) {
    const product = text(itemEl.querySelector(".draw-product")).replace(
      PRICE,
      "",
    );
    const url = (
      itemEl.getAttribute("data-draw-href") ??
      itemEl.querySelector("a.draw-link")?.getAttribute("href") ??
      ""
    ).trim();

    if (!url) {
      // 沒有連結 = 門市直接上架販售，不用抽
      items.push({ product, url: null, onSale: true });
    } else if (ALLOWED_LINK.test(url)) {
      items.push({ product, url, onSale: false });
    } else {
      rejected++;
    }
  }

  return {
    name: text(storeEl.querySelector(".draw-store-name")),
    city: (storeEl.getAttribute("data-draw-city") ?? "").trim(),
    startText,
    date: fromText.date,
    startTime, // "11:00" / "開店" / null（未註明）
    items,
    rejected,
  };
}

// html：原作者的 index.html 原始文字
// DOMParserImpl：瀏覽器用內建的 DOMParser；Node 測試時傳入 linkedom 的
export function parseDrawHtml(html, DOMParserImpl = globalThis.DOMParser) {
  const doc = new DOMParserImpl().parseFromString(html, "text/html");
  const list = doc.querySelector(".draw-list");
  if (!list) return { stores: [] };
  const stores = [...list.querySelectorAll(".draw-store")].map(parseStore);
  return { stores };
}

// 統計：家數、連結數、不重複連結數（只算有抽選連結的，現場販售不算）
export function summarize(stores) {
  const urls = stores.flatMap((s) =>
    s.items.filter((i) => !i.onSale).map((i) => i.url),
  );
  return {
    stores: stores.length,
    links: urls.length,
    uniqueLinks: new Set(urls).size,
    onSale: stores.reduce(
      (n, s) => n + s.items.filter((i) => i.onSale).length,
      0,
    ),
    rejected: stores.reduce((n, s) => n + s.rejected, 0),
  };
}
