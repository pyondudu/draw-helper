// 款式整理：以型號分組（例如 UX-01），同型號的不同寫法、錯字合併成一組。
// -00 結尾的型號可能是不同商品，再依名稱分開；沒有型號的歸到「其他」。

// -00 型號的名稱關鍵字表：名稱含有關鍵字，就歸到同一個商品
const ZERO_ALIASES = [
  { keywords: ["福音", "EVA"], label: "新世紀福音戰士" },
  { keywords: ["迪卡", "迪加"], label: "迪卡狂怒" },
  { keywords: ["天馬"], label: "暴風天馬" },
  { keywords: ["蒼龍神劍"], label: "蒼龍神劍" },
  { keywords: ["飛鳳"], label: "烈焰飛鳳" },
];

// 名稱更正表：店家寫錯型號時，名稱含有關鍵字就改用正確型號
// （例如 10/2 那輪有店把「時鐘幻象 隨機強化組」寫成 CX-15）
const NAME_FIXES = [{ keyword: "時鐘幻", code: "UX-16" }];

// 型號：2～3 個英文字母 + 橫線 + 數字，例如 UX-01、BXG-04、CX-11帝王威能
const CODE = /^([A-Z]{2,3})\s*-\s*(\d{1,3})\s*(.*)$/i;

// 規格字樣（例如 3-60F V2、0-70Z、BK1-50I）到結尾都去掉；括號裡的備註也去掉
const SPEC = /\s*[A-Z]{0,3}\d{1,2}\s*-\s*\d{2}[A-Z]{0,3}\b.*$/i;
const NOTE = /\s*[（(][^（）()]*[)）]/g;

// 全形轉半形、各種橫線都當成「-」、多個空白合成一個
export function normalizeProduct(text) {
  return text
    .normalize("NFKC")
    .replace(/[‐‑‒–—―−ー]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(rest) {
  return rest.replace(NOTE, "").replace(SPEC, "").trim();
}

// 回傳：{ key, code, name }
// key：用來分組和記住勾選（例如 "UX-19"、"CX-00:新世紀福音戰士"、"其他:超人力霸王聯名款"）
// name：這筆寫法去掉規格、備註後的名稱
export function identifyProduct(productText) {
  const text = normalizeProduct(productText);
  const m = text.match(CODE);
  const name = m ? cleanName(m[3]) : cleanName(text) || text;

  const fix = NAME_FIXES.find((f) => name.includes(f.keyword));
  if (fix) return { key: fix.code, code: fix.code, name };

  if (!m) return { key: `其他:${name}`, code: null, name };

  let prefix = m[1].toUpperCase();
  if (prefix === "BGX") prefix = "BXG";
  const num = m[2].padStart(2, "0");
  const code = `${prefix}-${num}`;

  if (/^0+$/.test(num)) {
    const alias = ZERO_ALIASES.find((a) =>
      a.keywords.some((k) => name.toUpperCase().includes(k)),
    );
    // 關鍵字表沒有的新商品，用名稱開頭 4 個字分組
    const sub = alias ? alias.label : name.replace(/\s/g, "").slice(0, 4);
    return { key: `${code}:${sub}`, code, name: alias ? alias.label : name };
  }
  return { key: code, code, name };
}

// 把所有商品寫法整理成款式清單
// entries：[{ product, ... }]，會在每筆加上 productKey
// 回傳：[{ key, code, label, variants: [寫法...] }]，依型號排序，「其他」排最後
export function groupProducts(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const { key, code, name } = identifyProduct(entry.product);
    entry.productKey = key;
    let g = groups.get(key);
    if (!g) {
      g = { key, code, names: new Map(), variants: new Set() };
      groups.set(key, g);
    }
    if (name) g.names.set(name, (g.names.get(name) ?? 0) + 1);
    g.variants.add(entry.product);
  }

  return [...groups.values()]
    .map((g) => {
      // 顯示名稱：最常見的寫法
      const best = [...g.names].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const label = g.code ? `${g.code} ${best}`.trim() : best;
      return { key: g.key, code: g.code, label, variants: [...g.variants] };
    })
    .sort((a, b) => {
      if (!a.code !== !b.code) return a.code ? -1 : 1;
      return a.key.localeCompare(b.key, "zh-Hant");
    });
}
