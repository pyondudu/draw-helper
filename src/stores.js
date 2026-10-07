// 門市對照表：同一家店每輪寫法不同，用關鍵字（全部出現才算）辨認。
// 對照表的縣市優先於原頁面的城市標籤（例如新竹遠雄有時被標成新竹縣）。

// 預設範圍與排列順序
export const DEFAULT_CITIES = ["桃園市", "新竹市", "新竹縣"];

// 順序就是同縣市內的排列順序
export const STORE_TABLE = [
  {
    id: "taoyuan-station",
    name: "桃園站前",
    keywords: ["桃園", "站前"],
    city: "桃園市",
  },
  {
    id: "taoyuan-a8",
    name: "桃園環球A8",
    keywords: ["桃園", "A8"],
    city: "桃園市",
  },
  { id: "global-a19", name: "環球A19", keywords: ["A19"], city: "桃園市" },
  {
    id: "zhongli-sogo",
    name: "中壢SOGO",
    keywords: ["中壢", "SOGO"],
    city: "桃園市",
  },
  { id: "zhongli-tayeh", name: "中壢大江", keywords: ["大江"], city: "桃園市" },
  {
    id: "taoyuan-feds",
    name: "桃園遠東",
    keywords: ["桃園遠東"],
    city: "桃園市",
  },
  { id: "tai-mall", name: "台茂", keywords: ["台茂"], city: "桃園市" },
  {
    id: "hsinchu-bigcity",
    name: "新竹巨城",
    keywords: ["巨城"],
    city: "新竹市",
  },
  {
    id: "hsinchu-feds",
    name: "新竹遠東",
    keywords: ["新竹遠東"],
    city: "新竹市",
  },
  {
    id: "hsinchu-farglory",
    name: "新竹遠雄",
    keywords: ["新竹遠雄"],
    city: "新竹市",
  },
  {
    id: "zhubei-feds",
    name: "竹北遠東",
    keywords: ["竹北", "遠"],
    city: "新竹縣",
  },
  {
    id: "sharing-square",
    name: "享平方",
    keywords: ["享平方"],
    city: "新竹縣",
  },
];

// 去掉空白和各種橫線，全形轉半形，不分大小寫
export function normalizeStoreName(name) {
  return name
    .normalize("NFKC")
    .replace(/[\s\-‐‑‒–—―−]/g, "")
    .toLowerCase();
}

const TABLE = STORE_TABLE.map((s) => ({
  ...s,
  normKeywords: s.keywords.map(normalizeStoreName),
}));

// 回傳：{ id, name, city, known, isNew }
// known：對照表認得；isNew：預設縣市裡出現了對照表認不出的店
export function identifyStore(rawName, cityLabel) {
  const norm = normalizeStoreName(rawName);
  const hit = TABLE.find((s) => s.normKeywords.every((k) => norm.includes(k)));
  if (hit) {
    return {
      id: hit.id,
      name: hit.name,
      city: hit.city,
      known: true,
      isNew: false,
    };
  }
  return {
    id: `raw:${norm}`,
    name: rawName,
    city: cityLabel,
    known: false,
    isNew: DEFAULT_CITIES.includes(cityLabel),
  };
}
