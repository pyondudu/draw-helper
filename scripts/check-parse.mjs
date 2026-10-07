// 驗證 src/parse.js，執行：npm run check
// 1. 手寫的假資料（不用連網）
// 2. 原作者的兩個固定版本（要連網；只在記憶體裡比對，不存檔）
import { readFileSync } from "node:fs";
import { DOMParser } from "linkedom";
import { parseDrawHtml, summarize } from "../src/parse.js";

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

// ---- 2. 原作者的固定版本 ----
const FIXED = [
  {
    label: "10/2 那輪最後版本（現行格式）",
    sha: "5617e3393f6427ce2259311f0cd29b42a3f16a46",
    total: { stores: 76, links: 1289, uniqueLinks: 1287 },
    cities: { 桃園市: [7, 102], 新竹市: [2, 38], 新竹縣: [2, 50] },
  },
  {
    label: "9/4 那輪更新到一半的版本（舊格式）",
    sha: "5adbf069b748fc65639e3842a736be57630b6de4",
    total: { stores: 74, links: 531 },
    cities: { 桃園市: [7, 56], 新竹市: [3, 20], 新竹縣: [1, 11] },
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
}

console.log(failed ? `\n❌ 有 ${failed} 項不符` : "\n✅ 全部相符");
process.exit(failed ? 1 : 0);
