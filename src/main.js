import { loadDraws, SOURCE_PAGE } from "./source.js";

const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

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
}

function renderSummary({ summary, round, readAt, previous }) {
  const card = el("div", "card");
  card.append(
    el("p", "round", round ? `${shortDate(round)} 那輪` : "這一輪"),
    el(
      "p",
      "",
      `共 ${summary.stores} 家門市、${summary.uniqueLinks.toLocaleString("zh-TW")} 個抽選連結`,
    ),
  );

  let change = "";
  if (previous && previous.round === round) {
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

async function refresh() {
  refreshBtn.disabled = true;
  renderLoading();
  const result = await loadDraws();
  if (result.ok) renderSummary(result);
  else renderError(result.reason);
  refreshBtn.disabled = false;
}

refreshBtn.addEventListener("click", refresh);
refresh();
