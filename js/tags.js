import { state } from './store.js';

// Built-in keywords. The first tag in each flavor group is the broad one,
// the rest get more specific. Your own keywords are added per group.
export const TAG_GROUPS = [
  { id: 'character', label: 'Cup character', open: true, tags: [
    'Nice acidity', 'Bright', 'Juicy', 'Sweet', 'Clean', 'Balanced', 'Complex', 'Delicate',
    'Tea-like', 'Silky', 'Syrupy', 'Light body', 'Full body', 'Long finish',
  ] },
  { id: 'flaws', label: 'Needs work', open: false, tags: [
    'Sour', 'Bitter', 'Astringent', 'Dry finish', 'Flat', 'Muddy', 'Thin', 'Watery', 'Harsh', 'Hollow', 'Papery',
  ] },
  { id: 'floral', label: 'Floral', open: true, tags: [
    'Floral', 'Jasmine', 'Rose', 'Orange blossom', 'Elderflower', 'Lavender', 'Chamomile', 'Hibiscus', 'Bergamot',
  ] },
  { id: 'berry', label: 'Berries', open: true, tags: [
    'Red berries', 'Strawberry', 'Raspberry', 'Red currant', 'Cranberry', 'Dark berries', 'Blueberry', 'Blackberry', 'Blackcurrant',
  ] },
  { id: 'citrus', label: 'Citrus', open: true, tags: [
    'Citrus', 'Lemon', 'Lime', 'Orange', 'Mandarin', 'Grapefruit', 'Yuzu',
  ] },
  { id: 'stone', label: 'Stone & orchard fruit', open: true, tags: [
    'Stone fruit', 'Peach', 'Apricot', 'Nectarine', 'Cherry', 'Plum', 'Green apple', 'Red apple', 'Pear', 'White grape', 'Red grape',
  ] },
  { id: 'tropical', label: 'Tropical', open: false, tags: [
    'Tropical fruit', 'Mango', 'Passion fruit', 'Pineapple', 'Papaya', 'Lychee', 'Guava', 'Banana',
  ] },
  { id: 'sweet', label: 'Sugars', open: false, tags: [
    'Honey', 'Caramel', 'Brown sugar', 'Panela', 'Maple syrup', 'Vanilla', 'Molasses', 'Candy',
  ] },
  { id: 'choc', label: 'Chocolate & nuts', open: false, tags: [
    'Milk chocolate', 'Dark chocolate', 'Cocoa', 'Almond', 'Hazelnut', 'Peanut', 'Praline',
  ] },
  { id: 'other', label: 'Tea, spice & more', open: false, tags: [
    'Black tea', 'Green tea', 'Earl Grey', 'Herbal', 'Cinnamon', 'Clove', 'Black pepper',
    'Wine-like', 'Rum', 'Fermented', 'Dried fruit', 'Raisin', 'Rhubarb', 'Tomato', 'Grassy', 'Woody', 'Tobacco',
  ] },
];

const builtin = new Map();
TAG_GROUPS.forEach((g) => g.tags.forEach((t) => builtin.set(t.toLowerCase(), g.id)));

export function tagGroups() {
  return TAG_GROUPS.map((g) => ({
    ...g,
    tags: [...g.tags, ...state.tags.filter((t) => t.category === g.id).map((t) => t.label)],
  }));
}

export function tagCategory(label) {
  const k = label.toLowerCase();
  return builtin.get(k) || state.tags.find((t) => t.label.toLowerCase() === k)?.category || 'other';
}

export function findTag(label) {
  const k = label.trim().toLowerCase();
  for (const g of tagGroups()) {
    const hit = g.tags.find((t) => t.toLowerCase() === k);
    if (hit) return hit;
  }
  return null;
}

export const PROCESSES = ['Washed', 'Natural', 'Honey', 'Anaerobic natural', 'Anaerobic washed', 'Carbonic maceration', 'Thermal shock', 'Co-fermented', 'Wet-hulled'];
export const ROAST_LEVELS = ['Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'];
export const ORIGINS = ['Ethiopia', 'Kenya', 'Colombia', 'Panama', 'Rwanda', 'Burundi', 'Costa Rica', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Mexico', 'Peru', 'Bolivia', 'Ecuador', 'Brazil', 'Yemen', 'Uganda', 'Tanzania', 'Indonesia', 'China', 'Taiwan'];
export const VARIETIES = ['Gesha', 'Ethiopian landrace', '74110', '74158', 'SL28', 'SL34', 'Batian', 'Ruiru 11', 'Bourbon', 'Pink Bourbon', 'Red Bourbon', 'Caturra', 'Catuai', 'Typica', 'Pacamara', 'Sidra', 'Wush Wush', 'Castillo', 'Maragogype', 'Mokka'];
export const FILTERS = ['Hario V60 tabbed', 'Hario V60 untabbed', 'Cafec Abaca', 'Cafec T-90', 'Sibarist Fast', 'Cafec Light Roast'];
