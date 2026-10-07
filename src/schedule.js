// 從抽選時間文字判斷這一輪什麼時候開始、什麼時候結束。

const DATE_TIME = /(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s*(\d{1,2}):(\d{2}))?/g;

function toTime(y, mo, d, h = 0, mi = 0) {
  return new Date(+y, +mo - 1, +d, +h, +mi).getTime();
}

// 開抽時刻：日期 + 開抽時間；「開店」或未註明時回傳 null（不自己猜）
export function startAt(store) {
  if (!store.date || !/^\d{2}:\d{2}$/.test(store.startTime ?? "")) return null;
  const [y, mo, d] = store.date.split("/");
  const [h, mi] = store.startTime.split(":");
  return toTime(y, mo, d, h, mi);
}

// 結束時刻：文字裡最後一個日期（和時間）。只有一個日期或沒寫時間時，當成那天 23:59。
export function endAt(store) {
  const matches = [...store.startText.normalize("NFKC").matchAll(DATE_TIME)];
  if (!matches.length) return null;
  const [, y, mo, d, h, mi] = matches.at(-1);
  if (matches.length === 1 || h === undefined) return toTime(y, mo, d, 23, 59);
  return toTime(y, mo, d, h, mi);
}

// 這一輪的狀態：{ state: "before" | "open" | "ended", firstStart }
// stores：範圍內、屬於這一輪的門市
export function roundState(stores, roundDate, now = Date.now()) {
  const starts = stores.map(startAt).filter((t) => t !== null);
  const ends = stores.map(endAt).filter((t) => t !== null);
  const [y, mo, d] = (roundDate ?? "").split("/");
  // 都沒寫開抽時間時，以這一輪日期的 0:00 當開始
  const firstStart = starts.length
    ? Math.min(...starts)
    : roundDate
      ? toTime(y, mo, d)
      : null;
  const lastEnd = ends.length ? Math.max(...ends) : null;

  if (firstStart !== null && now < firstStart)
    return { state: "before", firstStart };
  if (lastEnd !== null && now > lastEnd) return { state: "ended", firstStart };
  return { state: "open", firstStart };
}
