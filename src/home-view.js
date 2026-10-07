// 首頁：這一輪的狀態、進度總覽、每個想要的款式抽了幾家。
import { el } from "./dom.js";
import { isStoreInRange } from "./settings.js";
import { isDrawn } from "./records.js";
import { roundState } from "./schedule.js";

const STATE_TEXT = { before: "尚未開始", open: "進行中", ended: "已結束" };

function formatStart(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startLabel(store) {
  if (!store.startTime) return "時間未註明";
  return store.startTime === "開店" ? "開店" : `${store.startTime} 開抽`;
}

export function renderHome(container, round, roundDate, settings, records) {
  const inRange = round.stores.filter((s) => isStoreInRange(settings, s));
  const thisRound = inRange.filter((s) => s.date === roundDate);
  const { state, firstStart } = roundState(
    thisRound.length ? thisRound : round.stores,
    roundDate,
  );

  // 想要的款式：這輪有的，和這輪沒有的
  const wanted = round.products.filter((p) => settings.wanted.includes(p.key));
  const rows = [];
  const missing = [];
  for (const product of wanted) {
    const stores = inRange
      .map((store) => ({
        store,
        links: store.items.filter((i) => i.productKey === product.key),
      }))
      .filter((x) => x.links.length);
    if (stores.length) rows.push({ product, stores });
    else missing.push(product.label);
  }
  // 勾過、但這一輪完全沒出現的款式
  const present = new Set(round.products.map((p) => p.key));
  for (const key of settings.wanted) {
    if (!present.has(key)) missing.push(settings.wantedLabels[key] ?? key);
  }

  const allLinks = rows.flatMap((r) => r.stores.flatMap((x) => x.links));
  const drawnLinks = allLinks.filter((l) => isDrawn(records, l.url)).length;

  // ---- 狀態與進度 ----
  const card = el("div", "card");
  const stateLine = el("p", "state");
  stateLine.append(el("span", `state-badge ${state}`, STATE_TEXT[state]));
  if (state === "before" && firstStart) {
    stateLine.append(el("span", "muted", `${formatStart(firstStart)} 開抽`));
  }
  card.append(stateLine);
  card.append(
    el(
      "p",
      "",
      `範圍內 ${inRange.length} 家門市，共 ${allLinks.length} 筆要抽，已抽 ${drawnLinks} 筆`,
    ),
  );
  if (wanted.length === 0) {
    card.append(el("p", "muted", "還沒有勾選想要的款式。"));
  }
  const actions = el("div", "actions-row");
  if (drawnLinks < allLinks.length) {
    const start = el("a", "btn primary", "開始連續抽選");
    start.href = "#draw";
    actions.append(start);
  }
  const listLink = el("a", "btn", "清單模式");
  listLink.href = "#list";
  actions.append(listLink);
  const link = el("a", "btn", "設定門市和款式");
  link.href = "#settings";
  actions.append(link);
  card.append(actions);

  // ---- 每個想要的款式 ----
  const list = el("div", "progress-list");
  for (const { product, stores } of rows) {
    const doneStores = stores.filter((x) =>
      x.links.every((l) => isDrawn(records, l.url)),
    ).length;
    const details = el("details", "progress");
    const summary = el("summary");
    summary.append(
      el("span", "progress-name", product.label),
      el(
        "span",
        doneStores === stores.length ? "progress-count done" : "progress-count",
        `已抽 ${doneStores}／${stores.length} 家`,
      ),
    );
    details.append(summary);
    for (const { store, links } of stores) {
      const drawn = links.every((l) => isDrawn(records, l.url));
      const row = el("div", drawn ? "progress-store dim" : "progress-store");
      const name = el("span", "row-main");
      name.append(el("span", "", `${store.city}・${store.name}`));
      if (links.length > 1) {
        name.append(el("span", "muted small", `${links.length} 筆`));
      }
      row.append(
        name,
        el("span", "muted small", startLabel(store)),
        el("span", drawn ? "tag" : "tag todo", drawn ? "已抽" : "未抽"),
      );
      details.append(row);
    }
    if (doneStores < stores.length) {
      const only = el("a", "btn small", "全部抽完");
      only.href = `#draw/${encodeURIComponent(product.key)}`;
      const row = el("div", "progress-actions");
      row.append(only);
      details.append(row);
    }
    list.append(details);
  }

  const parts = [card, list];
  if (missing.length) {
    parts.push(
      el("p", "muted small missing", `這輪範圍內沒有：${missing.join("、")}`),
    );
  }
  container.replaceChildren(...parts);
}

// 這一輪中了的項目，固定在首頁最上方。時間照原文顯示，不解析、不倒數。
export function renderWinners(container, roundDate, records) {
  const won = Object.values(records)
    .filter((r) => r.status === "won" && r.round === roundDate)
    .sort((a, b) => a.at - b.at);
  if (!won.length) {
    container.replaceChildren();
    return;
  }
  const card = el("div", "card winners");
  card.append(el("p", "winners-title", `這一輪中了 ${won.length} 筆`));
  for (const r of won) {
    const item = el("div", "winner");
    item.append(
      el("p", "winner-where", r.store),
      el("p", "winner-product", r.product),
      el("p", "muted small", r.startText),
    );
    card.append(item);
  }
  card.append(
    el("p", "muted small", "購買規定以門市公告為準，實名制要本人到店。"),
  );
  container.replaceChildren(card);
}
