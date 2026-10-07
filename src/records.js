// 抽選紀錄：以連結本身記住抽過沒有。只存在這支手機的 localStorage。
// 每筆：{ status: "opened" | "won" | "lost", at, round, store, product, startText }
// store / product / startText 是當時的文字，之後「中了」清單要用。

const KEY = "draw-helper:records";

export function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function save(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // 存不了時，這次使用仍可操作，只是不會被記住
  }
}

export function isDrawn(records, url) {
  return Boolean(records[url]);
}

export function setRecord(url, status, info) {
  const records = loadRecords();
  records[url] = { ...records[url], ...info, status, at: Date.now() };
  save(records);
}

export function clearRecord(url) {
  const records = loadRecords();
  delete records[url];
  save(records);
}
