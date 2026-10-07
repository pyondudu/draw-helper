// 抽選紀錄：以連結本身記住抽過沒有。只存在這支手機的 localStorage。
// （第 6 步的連續抽選會寫入；目前只讀取）

const KEY = "draw-helper:records";

export function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function isDrawn(records, url) {
  return Boolean(records[url]);
}
