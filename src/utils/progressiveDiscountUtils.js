// Portado de progressiveDiscountUtils.js do projeto web original
// sem uso de DOMParser (incompatível com React Native)

const TIER_COLLECTION_KEYS = [
  'progressive_discount_tiers',
  'progressive_discounts',
  'progressive_discount_rules',
  'discount_tiers',
  'tiers',
  'rules',
];

const QUANTITY_KEYS = [
  'minimum_quantity', 'min_quantity', 'minimum_items',
  'min_items', 'photos_quantity', 'photo_quantity', 'quantity', 'items',
];

const PERCENTAGE_KEYS = [
  'discount_percentage', 'percentage', 'discount_percent',
  'discount_pct', 'percent', 'discount', 'value',
];

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const firstNumber = (source, keys) => {
  for (const key of keys) {
    const value = toNumber(source?.[key]);
    if (value !== null) return value;
  }
  return null;
};

const collectionFrom = (source) => {
  if (!source || typeof source !== 'object') return null;
  for (const key of TIER_COLLECTION_KEYS) {
    if (Array.isArray(source[key])) return source[key];
  }
  return null;
};

const normalizeObjectMap = (source) => {
  if (!source || Array.isArray(source) || typeof source !== 'object') return null;
  const entries = Object.entries(source);
  if (!entries.length || !entries.every(([q, p]) => toNumber(q) !== null && toNumber(p) !== null)) return null;
  return entries.map(([quantity, percentage]) => ({ quantity, percentage }));
};

const findRawTiers = (eventData) => {
  const possibleSources = [
    eventData,
    eventData?.progressive_discount,
    eventData?.discount_config,
    eventData?.progressive_discount_config,
    eventData?.owner,
  ];
  for (const source of possibleSources) {
    if (Array.isArray(source)) return source;
    const collection = collectionFrom(source);
    if (collection) return collection;
    const objectMap = normalizeObjectMap(source);
    if (objectMap) return objectMap;
  }
  return [];
};

export const getProgressiveDiscountTiers = (eventData) => {
  const seenQuantities = new Set();
  return findRawTiers(eventData)
    .filter((tier) => tier && tier.enabled !== false && tier.active !== false)
    .map((tier) => ({
      quantity: firstNumber(tier, QUANTITY_KEYS),
      percentage: firstNumber(tier, PERCENTAGE_KEYS),
    }))
    .filter(({ quantity, percentage }) => (
      quantity !== null && quantity > 0 && percentage !== null && percentage > 0
    ))
    .sort((a, b) => a.quantity - b.quantity)
    .filter(({ quantity }) => {
      if (seenQuantities.has(quantity)) return false;
      seenQuantities.add(quantity);
      return true;
    });
};
