// 清單模式：依縣市、門市展開全部抽選，任何一筆都能直接開，也能改回按錯的結果。
import { el, checkbox } from "./dom.js";
import { isStoreInRange, saveSettings } from "./settings.js";
import { loadRecords, setRecord, clearRecord, recordInfo } from "./records.js";

const STATUS_OPTIONS = [
  ["", "未抽"],
  ["opened", "已開過"],
  ["won", "中了"],
  ["lost", "沒中"],
];

function startLabel(store) {
  if (!store.startTime) return "時間未註明，請自行確認";
  return store.startTime === "開店"
    ? "開店開抽・時間未註明，請自行確認"
    : `${store.startTime} 開抽`;
}

export function renderList(container, round, roundDate, settings) {
  const records = loadRecords();
  const labels = new Map(round.products.map((p) => [p.key, p.label]));
  const rerender = () => renderList(container, round, roundDate, settings);

  // ---- 篩選開關 ----
  const filters = el("div", "card list-filters");
  const toggle = (text, key) => {
    const row = el("label", "row");
    row.append(
      checkbox(settings[key], (on) => {
        settings[key] = on;
        saveSettings(settings);
        rerender();
      }),
      el("span", "row-main", text),
    );
    return row;
  };
  filters.append(
    toggle("只看想要的款式", "listOnlyWanted"),
    toggle("只看未抽", "listOnlyTodo"),
  );

  const parts = [el("h2", "draw-title", "清單模式"), filters];
  let shown = 0;

  for (const city of round.cities) {
    const stores = round.stores.filter(
      (s) => s.city === city && isStoreInRange(settings, s),
    );
    const cityParts = [];
    for (const store of stores) {
      const items = store.items.filter(
        (i) =>
          (!settings.listOnlyWanted ||
            settings.wanted.includes(i.productKey)) &&
          (!settings.listOnlyTodo || !records[i.url]),
      );
      if (!items.length && !store.onSale.length) continue;

      const box = el("div", "list-store");
      const head = el("div", "list-store-head");
      head.append(
        el("span", "list-store-name", store.name),
        el("span", "muted small", startLabel(store)),
      );
      box.append(head);

      for (const item of items) {
        const label = labels.get(item.productKey) ?? item.product;
        const info = recordInfo(roundDate, store, label);
        const row = el("div", "list-item");
        const status = records[item.url]?.status ?? "";
        row.classList.toggle("dim", Boolean(status));

        const select = el("select", "list-status");
        select.setAttribute("aria-label", `${label} 的結果`);
        for (const [value, text] of STATUS_OPTIONS) {
          const opt = el("option", "", text);
          opt.value = value;
          select.append(opt);
        }
        select.value = status;
        select.addEventListener("change", () => {
          if (select.value) setRecord(item.url, select.value, info);
          else clearRecord(item.url);
          row.classList.toggle("dim", Boolean(select.value));
        });

        // 一般連結，由使用者點擊打開 LINE
        const open = el("a", "btn small", "開啟");
        open.href = item.url;
        open.target = "_blank";
        open.rel = "noopener";
        open.addEventListener("click", () => {
          if (!select.value) {
            setRecord(item.url, "opened", info);
            select.value = "opened";
            row.classList.add("dim");
          }
        });

        const name = el("span", "row-main", label);
        if (label !== item.product) {
          name.append(el("span", "muted small", item.product));
        }
        row.append(name, open, select);
        box.append(row);
        shown++;
      }

      if (store.onSale.length) {
        box.append(
          el(
            "p",
            "muted small list-onsale",
            `現場販售，不用抽：${store.onSale.join("、")}`,
          ),
        );
      }
      cityParts.push(box);
    }
    if (cityParts.length) {
      parts.push(el("h3", "list-city", city), ...cityParts);
    }
  }

  if (shown === 0) {
    parts.push(
      el(
        "p",
        "muted",
        settings.listOnlyTodo
          ? "範圍內沒有未抽的了。"
          : "範圍內沒有符合的抽選。可以關掉「只看想要的款式」，或到設定調整門市範圍。",
      ),
    );
  }
  container.replaceChildren(...parts);
}
