// Data layer. Two backends with the same surface:
//  - cloud: Supabase (when js/config.js is filled in)
//  - local: demo mode, everything in localStorage on this device
// All rows are kept in memory in `state`; the dataset is small enough.
import { CONFIG } from './config.js';
import { uuid, time, blobToDataURL } from './util.js';

export const TABLES = ['coffees', 'recipes', 'brews', 'tags'];
const LOCAL_KEY = 'coffee-library:local:v1';
const CACHE_KEY = 'coffee-library:cache:v1';
const PHOTO_BUCKET = 'coffee-photos';

export const state = { mode: 'local', user: null, coffees: [], recipes: [], brews: [], tags: [] };

let sb = null;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

export const cloudConfigured = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey);

// ---------- local storage helpers ----------
function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
const snapshot = () => Object.fromEntries(TABLES.map((t) => [t, state[t]]));

function applyData(data) {
  for (const t of TABLES) state[t] = Array.isArray(data?.[t]) ? data[t] : [];
  sortAll();
}

function sortAll() {
  state.brews.sort((a, b) => time(b.brewed_at) - time(a.brewed_at) || time(b.created_at) - time(a.created_at));
  state.coffees.sort((a, b) => time(b.created_at) - time(a.created_at));
  state.recipes.sort((a, b) => a.name.localeCompare(b.name));
  state.tags.sort((a, b) => a.label.localeCompare(b.label));
}

function persist() {
  if (state.mode === 'local') {
    if (!writeJSON(LOCAL_KEY, snapshot())) throw new Error('Device storage is full. Try removing some photos.');
  } else {
    writeJSON(CACHE_KEY, { user: state.user?.id, data: snapshot() });
  }
}

// ---------- lifecycle ----------
export async function init() {
  if (!cloudConfigured()) {
    state.mode = 'local';
    applyData(readJSON(LOCAL_KEY));
    return { needsAuth: false };
  }
  state.mode = 'cloud';
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const { data } = await sb.auth.getSession();
  state.user = data.session?.user ?? null;
  sb.auth.onAuthStateChange((_event, session) => { state.user = session?.user ?? null; });
  if (!state.user) return { needsAuth: true };
  const cache = readJSON(CACHE_KEY);
  if (cache?.user === state.user.id) applyData(cache.data);
  return { needsAuth: false };
}

async function fetchAll(table) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await sb.from(table).select('*').range(from, from + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) return out;
  }
}

export async function refresh() {
  if (state.mode === 'local') { applyData(readJSON(LOCAL_KEY)); emit(); return; }
  const results = await Promise.all(TABLES.map(fetchAll));
  applyData(Object.fromEntries(TABLES.map((t, i) => [t, results[i]])));
  persist();
  emit();
}

// ---------- CRUD ----------
function upsertState(table, row) {
  const list = state[table];
  const i = list.findIndex((r) => r.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  sortAll();
}

export async function save(table, row) {
  const rec = { ...row };
  if (!rec.id) rec.id = uuid();
  if (state.mode === 'local') {
    rec.created_at ??= new Date().toISOString();
    upsertState(table, rec);
    persist();
    emit();
    return rec;
  }
  const { data, error } = await sb.from(table).upsert(rec).select().single();
  if (error) throw error;
  upsertState(table, data);
  persist();
  emit();
  return data;
}

export async function remove(table, id) {
  if (state.mode === 'cloud') {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
  }
  state[table] = state[table].filter((r) => r.id !== id);
  // Mirror the database's foreign-key rules.
  if (table === 'coffees') state.brews = state.brews.filter((b) => b.coffee_id !== id);
  if (table === 'recipes') state.brews = state.brews.map((b) => (b.recipe_id === id ? { ...b, recipe_id: null } : b));
  persist();
  emit();
}

// ---------- photos ----------
export async function uploadPhoto(blob) {
  if (state.mode === 'local') return blobToDataURL(blob);
  const path = `${state.user.id}/${uuid()}.jpg`;
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deletePhoto(url) {
  if (state.mode !== 'cloud' || !url) return;
  const marker = `/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await sb.storage.from(PHOTO_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]).catch(() => {});
}

// ---------- auth ----------
export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() {
  await sb.auth.signOut();
  localStorage.removeItem(CACHE_KEY);
  applyData(null);
}

// ---------- backup / import ----------
export const exportData = () => ({ app: 'coffee-library', version: 1, exported_at: new Date().toISOString(), ...snapshot() });

export function localDemoData() {
  const d = readJSON(LOCAL_KEY);
  if (!d) return null;
  const count = TABLES.reduce((n, t) => n + (d[t]?.length || 0), 0);
  return count ? d : null;
}
export const clearLocalDemoData = () => localStorage.removeItem(LOCAL_KEY);

export async function importData(data) {
  const counts = {};
  const existingLabels = new Set(state.tags.map((t) => t.label.toLowerCase()));
  for (const t of TABLES) {
    let rows = (data?.[t] || []).map(({ user_id, ...r }) => r);
    if (t === 'tags') rows = rows.filter((r) => !existingLabels.has(r.label.toLowerCase()));
    if (t === 'coffees' && state.mode === 'cloud') {
      for (const r of rows) {
        if (r.photo_url?.startsWith('data:')) {
          try { r.photo_url = await uploadPhoto(await (await fetch(r.photo_url)).blob()); } catch { r.photo_url = null; }
        }
      }
    }
    counts[t] = rows.length;
    if (!rows.length) continue;
    if (state.mode === 'local') {
      rows.forEach((r) => upsertState(t, r));
    } else {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from(t).upsert(rows.slice(i, i + 200));
        if (error) throw error;
      }
    }
  }
  if (state.mode === 'local') { persist(); emit(); } else await refresh();
  return counts;
}

// ---------- lookups ----------
export const coffeeById = (id) => state.coffees.find((c) => c.id === id) || null;
export const recipeById = (id) => state.recipes.find((r) => r.id === id) || null;
export const brewById = (id) => state.brews.find((b) => b.id === id) || null;
export const brewsOfCoffee = (id) => state.brews.filter((b) => b.coffee_id === id);
export const brewsOfRecipe = (id) => state.brews.filter((b) => b.recipe_id === id);
export const lastBrewOf = (coffeeId) => state.brews.find((b) => b.coffee_id === coffeeId) || null;
