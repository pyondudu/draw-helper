import { loadDraws, SOURCE_PAGE } from "./source.js";
import { buildRound } from "./round.js";
import { loadSettings, updateNewProducts } from "./settings.js";
import { loadRecords } from "./records.js";
import { renderHome } from "./home-view.js";
import { renderSettings } from "./settings-view.js";
import { renderDraw, stopDrawView } from "./draw-view.js";
import { renderList } from "./list-view.js";
import { el } from "./dom.js";

const statusEl = document.getElementById("status");
const homeRangeEl = document.getElementById("homeRange");
const homeEl = document.getElementById("home");
const settingsEl = document.getElementById("settings");
const settingsBody = document.getElementById("settingsBody");
const drawEl = document.getElementById("draw");
const drawBody = document.getElementById("drawBody");
const listEl = document.getElementById("list");
const listBody = document.getElementById("listBody");
const refreshBtn = document.getElementById("refresh");

const settings = loadSettings();
let round = null; // 讀取成功後的這一輪資料
let roundDate = null; // 這一輪的日期，例如 2026/10/02

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

// 用網址的 # 切換頁面，手機的「上一頁」也能回首頁
// #settings：設定；#draw：連續抽選；#draw/<款式 key>：只抽這一款；#list：清單模式
function route() {
  const hash = decodeURIComponent(location.hash.slice(1));
  const page = round ? hash.split("/")[0] : "";
  homeEl.hidden = ["settings", "draw", "list"].includes(page);
  settingsEl.hidden = page !== "settings";
  drawEl.hidden = page !== "draw";
  listEl.hidden = page !== "list";
  stopDrawView();

  if (page === "settings") {
    renderSettings(settingsBody, round, settings);
  } else if (page === "draw") {
    const onlyKey = hash.slice("draw/".length) || null;
    renderDraw(drawBody, round, roundDate, settings, onlyKey);
  } else if (page === "list") {
    renderList(listBody, round, roundDate, settings);
  } else if (round) {
    renderHome(homeRangeEl, round, roundDate, settings, loadRecords());
  }
  window.scrollTo(0, 0);
}

async function refresh() {
  refreshBtn.disabled = true;
  renderLoading();
  const result = await loadDraws();
  if (result.ok) {
    round = buildRound(result.stores);
    roundDate = result.round;
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
