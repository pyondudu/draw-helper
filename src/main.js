import { loadDraws, SOURCE_PAGE } from "./source.js";
import { buildRound } from "./round.js";
import { loadSettings, updateNewProducts, isStoreInRange } from "./settings.js";
import { renderSettings } from "./settings-view.js";
import { el } from "./dom.js";

const statusEl = document.getElementById("status");
const homeRangeEl = document.getElementById("homeRange");
const homeEl = document.getElementById("home");
const settingsEl = document.getElementById("settings");
const settingsBody = document.getElementById("settingsBody");
const refreshBtn = document.getElementById("refresh");

const settings = loadSettings();
let round = null; // 讀取成功後的這一輪資料

function formatTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 「2026/10/02」→「10/2」
function shortDate(date) {
  const [, m, d] = date.split("/");
  return `${Number(m)}/${Number(d)}`;
}

function renderLoading() {
  statusEl.replaceChildren(el("p", "muted", "讀取中…"));
  homeRangeEl.replaceChildren();
}

function renderError(reason) {
  const box = el("div", "error");
  box.append(
    el("p", "error-title", "資料讀取失敗"),
    el("p", "muted", `${reason}。請稍後按「重新整理」，或直接打開原頁面。`),
  );
  const link = el("a", "btn primary", "打開原頁面");
  link.href = SOURCE_PAGE;
  link.target = "_blank";
  link.rel = "noopener";
  box.append(link);
  statusEl.replaceChildren(box);
  homeRangeEl.replaceChildren();
}

function renderSummary({ summary, round: roundDate, readAt, previous }) {
  const card = el("div", "card");
  card.append(
    el("p", "round", roundDate ? `${shortDate(roundDate)} 那輪` : "這一輪"),
    el(
      "p",
      "",
      `共 ${summary.stores} 家門市、${summary.uniqueLinks.toLocaleString("zh-TW")} 個抽選連結`,
    ),
  );

  let change = "";
  if (previous && previous.round === roundDate) {
    const diff = summary.uniqueLinks - previous.links;
    change =
      diff > 0
        ? `，比上次讀取多了 ${diff} 筆`
        : diff < 0
          ? `，比上次讀取少了 ${-diff} 筆`
          : "，和上次讀取一樣";
  } else if (previous) {
    change = "，這是新的一輪";
  }
  card.append(el("p", "muted", `讀取時間 ${formatTime(readAt)}${change}`));
  if (previous) {
    card.append(el("p", "muted", `上次讀取 ${formatTime(previous.readAt)}`));
  }
  statusEl.replaceChildren(card);
}

// 首頁：目前的範圍摘要和設定入口（完整的首頁在 5b 做）
function renderHomeRange() {
  if (!round) return;
  const stores = round.stores.filter((s) => isStoreInRange(settings, s));
  const wanted = round.products.filter((p) => settings.wanted.includes(p.key));
  const card = el("div", "card");
  card.append(
    el("p", "", `範圍內 ${stores.length} 家門市、想要 ${wanted.length} 個款式`),
  );
  if (wanted.length === 0) {
    card.append(el("p", "muted", "還沒有勾選想要的款式。"));
  }
  const link = el("a", "btn primary", "設定門市和款式");
  link.href = "#settings";
  card.append(link);
  homeRangeEl.replaceChildren(card);
}

// 用網址的 # 切換頁面，手機的「上一頁」也能回首頁
function route() {
  const onSettings = location.hash === "#settings" && round;
  homeEl.hidden = !!onSettings;
  settingsEl.hidden = !onSettings;
  if (onSettings) {
    renderSettings(settingsBody, round, settings);
  } else {
    renderHomeRange();
  }
  window.scrollTo(0, 0);
}

async function refresh() {
  refreshBtn.disabled = true;
  renderLoading();
  const result = await loadDraws();
  if (result.ok) {
    round = buildRound(result.stores);
    updateNewProducts(
      settings,
      result.round,
      round.products.map((p) => p.key),
    );
    renderSummary(result);
  } else {
    round = null;
    renderError(result.reason);
  }
  refreshBtn.disabled = false;
  route();
}

window.addEventListener("hashchange", route);
refreshBtn.addEventListener("click", refresh);
refresh();
