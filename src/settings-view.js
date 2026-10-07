// 設定頁：門市範圍、想要的款式。每次勾選都馬上存起來。
import { el, checkbox } from "./dom.js";
import { DEFAULT_CITIES } from "./stores.js";
import { isStoreChosen, isStoreInRange, saveSettings } from "./settings.js";

export function renderSettings(container, round, settings) {
  const cityParts = []; // { city, summaryCount, storeRows: [{ store, row, input }] }
  const productParts = []; // { product, row, count }

  function update() {
    saveSettings(settings);
    for (const part of cityParts) {
      const inCity = settings.cities.includes(part.city);
      let chosen = 0;
      for (const { store, row, input } of part.storeRows) {
        input.disabled = !inCity;
        row.classList.toggle("dim", !inCity);
        if (inCity && isStoreChosen(settings, store)) chosen++;
      }
      part.summaryCount.textContent = inCity
        ? `已選 ${chosen}／${part.storeRows.length} 家`
        : `未納入（${part.storeRows.length} 家）`;
    }
    const inRange = round.stores.filter((s) => isStoreInRange(settings, s));
    for (const { product, row, count } of productParts) {
      const n = inRange.filter((s) =>
        s.items.some((i) => i.productKey === product.key),
      ).length;
      count.textContent = n ? `${n} 家可抽` : "範圍內沒有";
      row.classList.toggle("dim", n === 0);
    }
  }

  // ---- 門市範圍 ----
  const storeSection = el("section", "settings-section");
  storeSection.append(
    el("h2", "", "門市範圍"),
    el("p", "muted", "勾選要跑的縣市；縣市裡的門市也可以個別取消。"),
  );
  for (const city of round.cities) {
    const stores = round.stores.filter((s) => s.city === city);
    const details = el("details", "city");
    details.open = DEFAULT_CITIES.includes(city);
    const summaryCount = el("span", "muted");
    const summary = el("summary");
    summary.append(el("span", "city-name", city), summaryCount);

    const cityToggle = el("label", "row city-toggle");
    cityToggle.append(
      checkbox(settings.cities.includes(city), (on) => {
        settings.cities = on
          ? [...settings.cities, city]
          : settings.cities.filter((c) => c !== city);
        update();
      }),
      el("span", "", `納入${city}`),
    );
    details.append(summary, cityToggle);

    const storeRows = [];
    for (const store of stores) {
      const row = el("label", "row store");
      const input = checkbox(isStoreChosen(settings, store), (on) => {
        settings.storeChoice[store.id] = on;
        update();
      });
      const info = el("span", "row-main");
      info.append(el("span", "", store.name));
      if (store.isNew) info.append(el("span", "badge", "新門市"));
      let note = `${store.items.length} 筆`;
      if (store.onSale.length) note += `・${store.onSale.length} 筆現場販售`;
      row.append(input, info, el("span", "muted small", note));
      details.append(row);
      storeRows.push({ store, row, input });
    }
    cityParts.push({ city, summaryCount, storeRows });
    storeSection.append(details);
  }

  // ---- 款式 ----
  const productSection = el("section", "settings-section");
  productSection.append(
    el("h2", "", "想要的款式"),
    el("p", "muted", "勾選想抽的款式。下一輪出現同型號時會自動勾好。"),
  );
  const isNew = new Set(settings.newProducts);
  let otherHeaderAdded = false;
  for (const product of round.products) {
    if (!product.code && !otherHeaderAdded) {
      productSection.append(el("h3", "", "其他（沒有型號）"));
      otherHeaderAdded = true;
    }
    const wrap = el("div", "product");
    const row = el("label", "row");
    const info = el("span", "row-main");
    info.append(el("span", "", product.label));
    if (isNew.has(product.key)) info.append(el("span", "badge", "新"));
    const count = el("span", "muted small");
    row.append(
      checkbox(settings.wanted.includes(product.key), (on) => {
        settings.wanted = on
          ? [...settings.wanted, product.key]
          : settings.wanted.filter((k) => k !== product.key);
        update();
      }),
      info,
      count,
    );
    wrap.append(row);

    // 展開看店家的原始寫法，方便發現寫錯型號的情況
    if (product.variants.length > 1) {
      const variants = el("details", "variants");
      variants.append(
        el("summary", "", `店家寫法 ${product.variants.length} 種`),
      );
      const list = el("ul");
      for (const v of product.variants) list.append(el("li", "", v));
      variants.append(list);
      wrap.append(variants);
    }
    productParts.push({ product, row: wrap, count });
    productSection.append(wrap);
  }

  container.replaceChildren(storeSection, productSection);
  update();
}
