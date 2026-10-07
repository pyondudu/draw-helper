// 驗證解析與整理程式，執行：npm run check
// 1. 手寫的假資料（不用連網）
// 2. 原作者的兩個固定版本（要連網；只在記憶體裡比對，不存檔）
import { readFileSync } from "node:fs";
import { DOMParser } from "linkedom";
import { parseDrawHtml, summarize } from "../src/parse.js";
import { identifyStore, DEFAULT_CITIES } from "../src/stores.js";
import { identifyProduct, groupProducts } from "../src/products.js";

let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? "✅" : "❌"} ${label}：${JSON.stringify(actual)}` +
      (ok ? "" : `（應為 ${JSON.stringify(expected)}）`),
  );
}

function cityStats(stores, city) {
  const inCity = stores.filter((s) => s.city === city);
  const { stores: n, links } = summarize(inCity);
  return [n, links];
}

function parseFile(path) {
  const html = readFileSync(new URL(path, import.meta.url), "utf8");
  return parseDrawHtml(html, DOMParser).stores;
}

// ---- 1. 假資料：現行格式 ----
console.log("\n【假資料：現行格式】");
{
  const stores = parseFile("../test/fixtures/current-format.html");
  check("統計", summarize(stores), {
    stores: 3,
    links: 6,
    uniqueLinks: 5,
    onSale: 1,
    rejected: 1,
  });
  check(
    "門市",
    stores.map((s) => [s.city, s.name, s.date, s.startTime]),
    [
      ["桃園市", "Funbox-假桃園站前店", "2026/10/09", "11:00"],
      ["桃園市", "Funbox 假中壢店", "2026/10/09", null],
      ["新竹縣", "Funbox 假竹北店", "2026/10/09", "開店"],
    ],
  );
  check(
    "第一家的商品",
    stores[0].items.map((i) => [i.product, i.url]),
    [
      ["UX-01 假蒼龍", "https://lin.ee/fakeA01"],
      ["CX-11假帝王", "https://lin.ee/fakeA02"],
      ["CX-11假帝王", "https://lin.ee/fakeA02"],
      ["BX-37 假戰鬥盤（採取上架販售）", null],
    ],
  );
  check(
    "沒有讀到加好友清單",
    stores.some((s) => s.items.some((i) => i.url?.includes("/ti/p/"))),
    false,
  );
}

// ---- 1. 假資料：舊格式 ----
console.log("\n【假資料：舊格式】");
{
  const stores = parseFile("../test/fixtures/old-format.html");
  check("統計", summarize(stores), {
    stores: 3,
    links: 4,
    uniqueLinks: 4,
    onSale: 0,
    rejected: 1,
  });
  check(
    "門市",
    stores.map((s) => [s.city, s.name, s.date, s.startTime]),
    [
      ["新竹市", "Fun Box 假巨城", "2026/09/04", "12:00"],
      ["新竹市", "Funbox 假遠雄店", "2026/09/04", null],
      ["新竹市", "Funbox 假新竹遠東", "2026/09/04", "09:00"],
    ],
  );
  check(
    "價格已去掉",
    stores.flatMap((s) => s.items.map((i) => i.product)),
    ["BX-26 假獨角", "BX-00 假天馬", "UX-13 假魔像", "超人力霸王聯名款"],
  );
}

// ---- 1. 門市對照表（需求說明第三節的寫法） ----
console.log("\n【門市對照表】");
{
  const cases = [
    ["Funbox-桃園站前三越", "桃園市", "taoyuan-station"],
    ["Funbox 桃園新光站前店", "桃園市", "taoyuan-station"],
    ["Funbox Toy-桃園環球A8店", "桃園市", "taoyuan-a8"],
    ["Funbox-桃園環球A8店", "桃園市", "taoyuan-a8"],
    ["Funbox 桃園環球A8", "桃園市", "taoyuan-a8"],
    ["FunBox - 桃園環球A19店", "桃園市", "global-a19"],
    ["FunBox-環球桃園A19", "桃園市", "global-a19"],
    ["Funbox 環球桃園A19店", "桃園市", "global-a19"],
    ["Funbox toys - 桃園台茂店", "桃園市", "tai-mall"],
    ["Funbox Toys 桃園台茂店", "桃園市", "tai-mall"],
    ["Fun Box 新竹巨城", "新竹市", "hsinchu-bigcity"],
    ["Funbox 竹北遠東店", "新竹縣", "zhubei-feds"],
    ["Funbox-竹北遠百店", "新竹縣", "zhubei-feds"],
    ["ＦＵＮＢＯＸ 中壢ｓｏｇｏ店", "桃園市", "zhongli-sogo"],
  ];
  check(
    "各種寫法都認得",
    cases.filter(([name, city, id]) => identifyStore(name, city).id !== id),
    [],
  );
  const farglory = identifyStore("Funbox 新竹遠雄店", "新竹縣");
  check("新竹遠雄標成新竹縣，仍歸新竹市", farglory.city, "新竹市");
  check(
    "台北的 A8、站前不會誤認",
    [
      identifyStore("Funbox 台北站前店", "台北市").known,
      identifyStore("Funbox 環球板橋A8店", "新北市").known,
    ],
    [false, false],
  );
  const unknownHere = identifyStore("Funbox 假竹東店", "新竹縣");
  const unknownFar = identifyStore("Funbox 假台中店", "台中市");
  check(
    "認不出的店（桃竹標新門市，其他縣市不標）",
    [unknownHere.city, unknownHere.isNew, unknownFar.city, unknownFar.isNew],
    ["新竹縣", true, "台中市", false],
  );
}

// ---- 1. 款式整理（需求說明第四節的寫法） ----
console.log("\n【款式整理】");
{
  const key = (text) => identifyProduct(text).key;
  const cases = [
    ["UX-19 子彈獅鷲H", "UX-19"],
    ["UX-19 子彈獅鷲", "UX-19"],
    ["UX-19 子彈獅鷺H", "UX-19"],
    ["UX-14 天蠍長矛0-70Z", "UX-14"],
    ["UX-13 魔象奇岩", "UX-13"],
    ["CX-11帝王威能", "CX-11"],
    ["ＵＸ－０１ 蒼龍爆刃", "UX-01"],
    ["UX—17 隕星龍騎士3–70J", "UX-17"],
    ["BGX-04 銀牙烈虎", "BXG-04"],
    ["bxg-4 銀牙烈虎", "BXG-04"],
    ["CX-00 新世紀福音戰士改造組", "CX-00:新世紀福音戰士"],
    ["CX-00 EVA 福音戰士聯名款套組", "CX-00:新世紀福音戰士"],
    ["CX-00 迪卡狂怒", "CX-00:迪卡狂怒"],
    ["CX-00 超人迪加", "CX-00:迪卡狂怒"],
    ["BX-00 暴風天馬3-70RA", "BX-00:暴風天馬"],
    ["BX-00 蒼龍神劍 3-60F V2", "BX-00:蒼龍神劍"],
    ["CX-00 假新商品組", "CX-00:假新商品"],
    ["CX-15 時鐘幻象 隨機強化組", "UX-16"],
    ["UX-16 時鐘幻想 隨機強化組", "UX-16"],
    ["CX-15 邪神狂怒", "CX-15"],
    ["超人力霸王聯名款", "其他:超人力霸王聯名款"],
    ["孩之寶系列（依照賣場實際款式為主）", "其他:孩之寶系列"],
  ];
  check(
    "型號辨認",
    cases.filter(([text, k]) => key(text) !== k).map(([t]) => [t, key(t)]),
    [],
  );
  const groups = groupProducts([
    { product: "UX-13 魔像奇岩" },
    { product: "UX-13 魔像奇岩" },
    { product: "UX-13 魔象奇岩" },
    { product: "BX-26 獨角刺心 5-60GP" },
    { product: "超人力霸王聯名款" },
  ]);
  check(
    "分組與顯示名稱（最常見的寫法，去掉規格）",
    groups.map((g) => g.label),
    ["BX-26 獨角刺心", "UX-13 魔像奇岩", "超人力霸王聯名款"],
  );
}

// ---- 2. 原作者的固定版本 ----
const FIXED = [
  {
    label: "10/2 那輪最後版本（現行格式）",
    sha: "5617e3393f6427ce2259311f0cd29b42a3f16a46",
    total: { stores: 76, links: 1289, uniqueLinks: 1287 },
    cities: { 桃園市: [7, 102], 新竹市: [2, 38], 新竹縣: [2, 50] },
    knownStores: 11,
    zeroKeys: [
      "BX-00:暴風天馬",
      "BX-00:蒼龍神劍",
      "CX-00:新世紀福音戰士",
      "CX-00:迪卡狂怒",
      "UX-00:新世紀福音戰士",
    ],
  },
  {
    label: "9/4 那輪更新到一半的版本（舊格式）",
    sha: "5adbf069b748fc65639e3842a736be57630b6de4",
    total: { stores: 74, links: 531 },
    cities: { 桃園市: [7, 56], 新竹市: [3, 20], 新竹縣: [1, 11] },
    knownStores: 11,
    zeroKeys: ["BX-00:暴風天馬", "BX-00:烈焰飛鳳", "BX-00:蒼龍神劍"],
  },
];

for (const v of FIXED) {
  console.log(`\n【固定版本：${v.label}】`);
  const url = `https://raw.githubusercontent.com/UXUX11/funbox-line/${v.sha}/index.html`;
  let html;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    failed++;
    console.log(`❌ 讀取失敗：${err.message}`);
    continue;
  }
  const stores = parseDrawHtml(html, DOMParser).stores;
  const sum = summarize(stores);
  const picked = Object.fromEntries(
    Object.keys(v.total).map((k) => [k, sum[k]]),
  );
  check("總計", picked, v.total);
  for (const [city, expected] of Object.entries(v.cities)) {
    check(`${city}（家, 連結）`, cityStats(stores, city), expected);
  }
  console.log(
    `   （參考）現場販售 ${sum.onSale} 筆、被丟掉的連結 ${sum.rejected} 筆、` +
      `開抽時間未註明 ${stores.filter((s) => !s.startTime).length} 家`,
  );

  const ids = stores.map((s) => identifyStore(s.name, s.city));
  check(
    "桃竹門市都認得（不重複家數）",
    new Set(ids.filter((r) => r.known).map((r) => r.id)).size,
    v.knownStores,
  );
  check(
    "桃竹沒有認不出的店",
    ids.filter((r) => r.isNew).map((r) => r.name),
    [],
  );
  check(
    "桃竹以外的店沒有誤認",
    stores
      .filter((s, i) => ids[i].known && !DEFAULT_CITIES.includes(s.city))
      .map((s) => s.name),
    [],
  );
  const groups = groupProducts(stores.flatMap((s) => s.items));
  check(
    "-00 型號依名稱分開",
    groups
      .filter((g) => g.key.includes(":") && g.code)
      .map((g) => g.key)
      .sort(),
    [...v.zeroKeys].sort(),
  );
  console.log(`   （參考）共整理出 ${groups.length} 個款式`);
}

console.log(failed ? `\n❌ 有 ${failed} 項不符` : "\n✅ 全部相符");
process.exit(failed ? 1 : 0);
