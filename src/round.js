// 把解析結果整理成「這一輪」：門市用對照表合併、款式分組、依縣市排序。
import { identifyStore, DEFAULT_CITIES, STORE_TABLE } from "./stores.js";
import { groupProducts } from "./products.js";

const TABLE_ORDER = new Map(STORE_TABLE.map((s, i) => [s.id, i]));

export function buildRound(parsedStores) {
  const byId = new Map();
  const seenUrls = new Set();

  for (const raw of parsedStores) {
    const who = identifyStore(raw.name, raw.city);
    let store = byId.get(who.id);
    if (!store) {
      store = {
        ...who,
        rawNames: [],
        startTime: raw.startTime,
        startText: raw.startText,
        date: raw.date,
        items: [],
        onSale: [],
      };
      byId.set(who.id, store);
    }
    store.rawNames.push(raw.name);
    for (const item of raw.items) {
      if (item.onSale) {
        store.onSale.push(item.product);
      } else if (!seenUrls.has(item.url)) {
        // 同一個連結只算一筆
        seenUrls.add(item.url);
        store.items.push({ product: item.product, url: item.url });
      }
    }
  }

  const stores = [...byId.values()];
  // 每筆加上 productKey，並整理出款式清單
  const products = groupProducts(stores.flatMap((s) => s.items));

  // 縣市順序：預設的桃竹在前，其他依原頁面出現順序
  const cities = [
    ...DEFAULT_CITIES.filter((c) => stores.some((s) => s.city === c)),
  ];
  for (const s of stores) if (!cities.includes(s.city)) cities.push(s.city);

  // 同縣市內：對照表的店依對照表順序，其他依原頁面順序
  const sourceOrder = new Map(stores.map((s, i) => [s.id, i]));
  const rank = (s) => TABLE_ORDER.get(s.id) ?? 1000 + sourceOrder.get(s.id);
  stores.sort(
    (a, b) =>
      cities.indexOf(a.city) - cities.indexOf(b.city) || rank(a) - rank(b),
  );

  return { stores, cities, products };
}
