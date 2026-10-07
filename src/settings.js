// 使用者的設定：只存在這支手機的 localStorage，不上傳。
import { DEFAULT_CITIES } from "./stores.js";

const KEY = "draw-helper:settings";

function defaults() {
  return {
    cities: [...DEFAULT_CITIES], // 納入範圍的縣市
    storeChoice: {}, // 個別門市的選擇 { id: true/false }，沒寫就用預設
    wanted: [], // 想要的款式 key
    knownProducts: [], // 看過的款式 key（判斷「新」用）
    productsRound: null, // 上次整理「新」款式的那一輪
    newProducts: [], // 這一輪第一次出現的款式 key
  };
}

export function loadSettings() {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return defaults();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 存不了（例如私密模式）時，這次使用仍可操作，只是不會被記住
  }
}

// 門市預設：對照表認得的店納入；桃竹認不出的「新門市」不納入，讓使用者決定
export function isStoreChosen(settings, store) {
  return settings.storeChoice[store.id] ?? !store.isNew;
}

export function isStoreInRange(settings, store) {
  return settings.cities.includes(store.city) && isStoreChosen(settings, store);
}

// 找出這一輪第一次出現的款式（同一輪陸續加入的也算）。
// 第一次使用時全部都沒看過，就不標「新」。
export function updateNewProducts(settings, round, productKeys) {
  const known = new Set(settings.knownProducts);
  const firstUse = known.size === 0;
  if (settings.productsRound !== round) {
    settings.productsRound = round;
    settings.newProducts = [];
  }
  for (const k of productKeys) {
    if (known.has(k)) continue;
    known.add(k);
    if (!firstUse) settings.newProducts.push(k);
  }
  settings.knownProducts = [...known];
  saveSettings(settings);
}
