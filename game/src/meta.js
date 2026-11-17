// Meta-progression: embers gathered across runs bank into a Lantern
// Upgrades shop. Bought upgrades apply to every run after. One file,
// one job: the bank, the shop, and the bonuses a run starts with.

const BANK_KEY = 'emberfield-bank';
const META_KEY = 'emberfield-meta';

/** localStorage where there is one, an in-memory stand-in elsewhere. */
const memory = {};
const store = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* no storage: fall through to memory */
  }
  return {
    getItem: (k) => (k in memory ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
  };
})();

function readJson(key, fallback) {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the shop is session-only then */
  }
}

export const SHOP_ITEMS = [
  { id: 'damage', name: 'Bright Wick', desc: '+10% bolt damage', max: 3, baseCost: 40 },
  { id: 'health', name: 'Sturdy Frame', desc: '+25 max health', max: 3, baseCost: 40 },
  { id: 'magnet', name: 'Wide Net', desc: '+20% ember magnet', max: 3, baseCost: 30 },
];

/** Embers banked across runs. */
export function loadBank() {
  const n = readJson(BANK_KEY, 0);
  return typeof n === 'number' && n >= 0 ? Math.floor(n) : 0;
}

/** Owned shop levels, e.g. { damage: 1, health: 0, magnet: 2 }. */
export function loadMeta() {
  const m = readJson(META_KEY, {});
  const out = {};
  for (const item of SHOP_ITEMS) {
    const v = m[item.id];
    out[item.id] = typeof v === 'number' && v >= 0 ? Math.min(item.max, Math.floor(v)) : 0;
  }
  return out;
}

/** Cost of the next level of an item at its current owned level. */
export function shopCost(item, level) {
  return item.baseCost * (level + 1);
}

/** Buy one level of an item; returns true when the bank covered it. */
export function buyItem(id) {
  const item = SHOP_ITEMS.find((s) => s.id === id);
  if (!item) return false;
  const meta = loadMeta();
  const bank = loadBank();
  if (meta[id] >= item.max) return false;
  const cost = shopCost(item, meta[id]);
  if (bank < cost) return false;
  meta[id] += 1;
  writeJson(META_KEY, meta);
  writeJson(BANK_KEY, bank - cost);
  return true;
}

/** Bank embers gathered in a run. */
export function bankEmbers(amount) {
  if (!(amount > 0)) return loadBank();
  const bank = loadBank() + Math.floor(amount);
  writeJson(BANK_KEY, bank);
  return bank;
}

/** The bonuses a run starts with from owned shop levels. */
export function metaBonuses() {
  const meta = loadMeta();
  return {
    damageMul: 1 + 0.1 * meta.damage,
    maxHpBonus: 25 * meta.health,
    magnetMul: 1 + 0.2 * meta.magnet,
  };
}
