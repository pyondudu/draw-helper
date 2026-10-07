// 連續抽選：依開抽時間 → 縣市 → 門市的順序，一筆接一筆抽。
// 「開店」和未註明時間的排在最後（不自己猜時間，當天都可以按）。
import { el } from "./dom.js";
import { isStoreInRange } from "./settings.js";
import {
  loadRecords,
  isDrawn,
  setRecord,
  clearRecord,
  recordInfo,
} from "./records.js";
import { startAt } from "./schedule.js";

let skipped = []; // 這次使用中按了「略過」的連結，依序排到最後
// 這次使用中剛開過、還沒按結果的連結。關掉 App 後就當成抽過，不再出現。
let pendingUrl = null;
let timer = null;

export function stopDrawView() {
  clearInterval(timer);
  timer = null;
}

// 範圍內、想要的款式（或指定的一款）的所有抽選，已排好順序
function allEntries(round, settings, onlyKey) {
  const keys = onlyKey ? [onlyKey] : settings.wanted;
  const productOrder = new Map(round.products.map((p, i) => [p.key, i]));
  const labels = new Map(round.products.map((p) => [p.key, p.label]));
  const entries = [];
  round.stores.forEach((store, storeIndex) => {
    if (!isStoreInRange(settings, store)) return;
    for (const item of store.items) {
      if (!keys.includes(item.productKey)) continue;
      entries.push({
        store,
        item,
        label: labels.get(item.productKey),
        start: startAt(store),
        storeIndex,
        productIndex: productOrder.get(item.productKey),
      });
    }
  });
  // round.stores 已依縣市、門市排好，所以 storeIndex 就代表縣市 → 門市的順序
  return entries.sort(
    (a, b) =>
      (a.start ?? Infinity) - (b.start ?? Infinity) ||
      a.storeIndex - b.storeIndex ||
      a.productIndex - b.productIndex,
  );
}

function formatCountdown(ms) {
  const s = Math.ceil(ms / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function renderDraw(container, round, roundDate, settings, onlyKey) {
  stopDrawView();
  const records = loadRecords();
  const entries = allEntries(round, settings, onlyKey);
  const todo = entries.filter(
    (e) => !isDrawn(records, e.item.url) || e.item.url === pendingUrl,
  );
  // 略過的排到最後，依略過的先後
  const skipIndex = (e) => skipped.indexOf(e.item.url);
  todo.sort((a, b) => skipIndex(a) - skipIndex(b));
  const doneCount = entries.length - todo.length;

  const title = onlyKey
    ? `只抽：${round.products.find((p) => p.key === onlyKey)?.label ?? onlyKey}`
    : "連續抽選";
  const parts = [el("h2", "draw-title", title)];

  if (entries.length === 0) {
    parts.push(
      el("p", "muted", "範圍內沒有要抽的。請先到設定勾選想要的款式。"),
    );
    container.replaceChildren(...parts);
    return;
  }

  // ---- 全部抽完 ----
  if (todo.length === 0) {
    const won = entries.filter((e) => records[e.item.url]?.status === "won");
    const card = el("div", "card");
    card.append(
      el("p", "round", "全部抽完了"),
      el("p", "", `共 ${entries.length} 筆，中了 ${won.length} 筆。`),
    );
    const back = el("a", "btn primary", "回首頁");
    back.href = "#";
    card.append(back);
    parts.push(card);
    container.replaceChildren(...parts);
    return;
  }

  // ---- 目前這一筆 ----
  const current = todo[0];
  const { store, item, label, start } = current;
  const url = item.url;
  const opened = url === pendingUrl && records[url]?.status === "opened";
  const rerender = () =>
    renderDraw(container, round, roundDate, settings, onlyKey);

  const card = el("div", "card draw-card");
  card.append(
    el("p", "muted", `第 ${doneCount + 1} 筆／共 ${entries.length} 筆`),
    el("p", "draw-where", `${store.city}・${store.name}`),
    el("p", "draw-product", label),
  );

  const timeLine = el("p", "muted small");
  if (start === null) {
    timeLine.textContent =
      store.startTime === "開店"
        ? "開店開抽・時間未註明，請自行確認"
        : "時間未註明，請自行確認";
  } else {
    timeLine.textContent = `${store.startTime} 開抽`;
  }
  card.append(timeLine);

  const resultRow = el("div", "draw-results");
  const info = recordInfo(roundDate, store, label);
  const won = el("button", "btn good", "中了");
  won.addEventListener("click", () => {
    setRecord(url, "won", info);
    pendingUrl = null;
    rerender();
  });
  const lost = el("button", "btn", "沒中");
  lost.addEventListener("click", () => {
    setRecord(url, "lost", info);
    pendingUrl = null;
    rerender();
  });
  const skip = el("button", "btn ghost", "略過");
  skip.addEventListener("click", () => {
    if (url === pendingUrl) {
      clearRecord(url);
      pendingUrl = null;
    }
    skipped = skipped.filter((u) => u !== url).concat(url);
    rerender();
  });
  won.hidden = lost.hidden = !opened;
  resultRow.append(won, lost, skip);

  const notYet = start !== null && Date.now() < start;
  if (notYet) {
    // 還沒到開抽時間：按鈕不能按，顯示倒數
    const wait = el("button", "btn big", "");
    wait.disabled = true;
    const tick = () => {
      const left = start - Date.now();
      if (left <= 0) return rerender();
      wait.textContent = `${formatCountdown(left)} 後開抽`;
    };
    tick();
    timer = setInterval(tick, 1000);
    card.append(wait);
  } else {
    // 一般連結，由使用者點擊打開 LINE（不用程式自動跳轉）
    const open = el("a", "btn primary big", opened ? "再開一次" : "開啟抽選");
    open.href = url;
    open.target = "_blank";
    open.rel = "noopener";
    open.addEventListener("click", () => {
      setRecord(url, "opened", info);
      pendingUrl = url;
      // 不重畫整個畫面，避免影響連結本身的開啟；只顯示結果按鈕
      won.hidden = lost.hidden = false;
      open.textContent = "再開一次";
    });
    card.append(open);
  }
  card.append(resultRow);
  if (!opened && !notYet) {
    card.append(
      el("p", "muted small", "在 LINE 抽完後回到這裡，按「中了」或「沒中」。"),
    );
  }
  parts.push(card);

  // 接下來幾筆，讓使用者知道後面還有什麼
  const next = todo.slice(1, 4);
  if (next.length) {
    const list = el("div", "draw-next");
    list.append(el("p", "muted small", `接下來（還有 ${todo.length - 1} 筆）`));
    for (const e of next) {
      list.append(
        el(
          "p",
          "small",
          `${e.start === null ? "未註明" : e.store.startTime}・${e.store.name}・${e.label}`,
        ),
      );
    }
    parts.push(list);
  }

  container.replaceChildren(...parts);
}
