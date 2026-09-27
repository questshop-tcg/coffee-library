import {
  html, raw, esc, fmtNum, fmtScore, fmtDuration, fmtRatio, ratio, relDay, shortDate, time, hash, ratingWord,
} from './util.js';
import { state, coffeeById, recipeById, save } from './store.js';
import { tagGroups, tagCategory, findTag, TAG_GROUPS } from './tags.js';

// ---------- icons ----------
const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  repeat: '<path d="M4 11V9a4 4 0 0 1 4-4h11"/><path d="M16 2l3 3-3 3"/><path d="M20 13v2a4 4 0 0 1-4 4H5"/><path d="M8 22l-3-3 3-3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8.5 9h7M8.5 12.5h5"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
  archive: '<path d="M4 5h16v4H4zM6 9v10h12V9M10 13h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  cone: '<path d="M3.5 5.5h17"/><path d="M5 5.5 10.3 14h3.4L19 5.5"/><path d="M8 17.5h8"/>',
  bean: '<ellipse cx="12" cy="12" rx="6.3" ry="8.8" transform="rotate(35 12 12)"/><path d="M7.6 18.3C10 15.2 9.2 13 12 12s2.2-3.4 4.4-6.3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
};
export const icon = (name, cls = '') => raw(`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`);

// ---------- page chrome ----------
export function pageHead({ title, eyebrow, back, actions }) {
  return html`
    <header class="page-head">
      <div class="page-head-bar">
        ${back ? html`<button class="icon-btn" type="button" data-back="${back}" aria-label="Back">${icon('back')}</button>` : html`<span></span>`}
        <div class="page-head-actions">${actions || ''}</div>
      </div>
      ${eyebrow ? html`<div class="eyebrow">${eyebrow}</div>` : ''}
      <h1 class="display">${title}</h1>
    </header>`;
}

export function emptyState({ title, text, action, art = 'cone' }) {
  return html`
    <div class="empty">
      <div class="empty-art">${icon(art)}</div>
      <h3>${title}</h3>
      ${text ? html`<p>${text}</p>` : ''}
      ${action || ''}
    </div>`;
}

export function notFound(root, what = 'page') {
  root.innerHTML = html`${pageHead({ title: 'Not found', back: '/' })}${emptyState({ title: `This ${what} doesn’t exist`, text: 'It may have been deleted.' })}`.s;
}

// ---------- rating ----------
export function ratingBadge(r, size = 'md') {
  const p = r == null ? 0 : Math.max(0, Math.min(100, r * 10));
  return html`<div class="rating rating-${size} ${r == null ? 'is-empty' : ''}" style="--p:${p}"><span>${fmtScore(r)}</span></div>`;
}

export function ratingDelta(b, prev) {
  if (!prev || b.rating == null || prev.rating == null) return '';
  const d = b.rating - prev.rating;
  if (d === 0) return html`<span class="delta flat">±0</span>`;
  return html`<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))}</span>`;
}

// ---------- brews ----------
export const coffeeName = (id) => coffeeById(id)?.name || 'Unknown coffee';
export const recipeName = (id) => (id ? recipeById(id)?.name || 'Deleted recipe' : 'Own recipe');

export function paramBits(b) {
  const bits = [];
  if (b.dose_g != null || b.water_g != null) bits.push(`${fmtNum(b.dose_g) || '?'}g / ${fmtNum(b.water_g) || '?'}g`);
  const r = ratio(b.dose_g, b.water_g);
  if (r) bits.push(fmtRatio(r));
  if (b.grind_setting) bits.push(`grind ${b.grind_setting}`);
  if (b.temp_c != null) bits.push(`${fmtNum(b.temp_c)}°C`);
  if (b.total_time_s != null) bits.push(fmtDuration(b.total_time_s));
  if (b.target_time_s != null) bits.push(`~${fmtDuration(b.target_time_s)}`);
  return bits;
}
export const paramLine = (b) => html`<div class="params">${paramBits(b).map((x, i) => html`${i ? html`<i>·</i>` : ''}<span>${x}</span>`)}</div>`;

// For each brew, the brew of the same coffee right before it.
export function buildPrevMap(brews = state.brews) {
  const byCoffee = new Map();
  for (const b of brews) {
    if (!byCoffee.has(b.coffee_id)) byCoffee.set(b.coffee_id, []);
    byCoffee.get(b.coffee_id).push(b);
  }
  const prev = new Map();
  for (const list of byCoffee.values()) {
    list.sort((a, b) => time(a.brewed_at) - time(b.brewed_at) || time(a.created_at) - time(b.created_at));
    list.forEach((b, i) => prev.set(b.id, list[i - 1] || null));
  }
  return prev;
}

const dash = (v) => (v == null || v === '' ? '—' : v);
const DIFF_FIELDS = [
  { key: 'recipe_id', label: 'Recipe', fmt: (v) => recipeName(v) },
  { key: 'dose_g', label: 'Dose', fmt: (v) => dash(v != null ? `${fmtNum(v)}g` : null) },
  { key: 'water_g', label: 'Water', fmt: (v) => dash(v != null ? `${fmtNum(v)}g` : null) },
  { key: 'grind_setting', label: 'Grind', fmt: dash },
  { key: 'temp_c', label: 'Temp', fmt: (v) => dash(v != null ? `${fmtNum(v)}°C` : null) },
  { key: 'bloom_water_g', label: 'Bloom', fmt: (v) => dash(v != null ? `${fmtNum(v)}g` : null) },
  { key: 'bloom_time_s', label: 'Bloom time', fmt: (v) => dash(v != null ? `${v}s` : null) },
  { key: 'pours', label: 'Pours', text: true },
  { key: 'grinder', label: 'Grinder', fmt: dash },
  { key: 'filter', label: 'Filter', fmt: dash },
  { key: 'water', label: 'Water type', fmt: dash },
  { key: 'total_time_s', label: 'Time', fmt: (v) => dash(v != null ? fmtDuration(v) : null), outcome: true },
];
const norm = (v) => (v == null || v === '' ? null : String(v).trim().toLowerCase());

export function diffBrews(b, prev) {
  if (!prev) return [];
  const out = [];
  for (const f of DIFF_FIELDS) {
    if (norm(prev[f.key]) === norm(b[f.key])) continue;
    out.push(f.text ? { label: f.label, text: 'changed' } : { label: f.label, from: f.fmt(prev[f.key]), to: f.fmt(b[f.key]), outcome: f.outcome });
  }
  return out;
}

export function changeChips(changes, { limit = 99 } = {}) {
  if (!changes.length) return '';
  const shown = changes.slice(0, limit);
  return html`<div class="changes">${shown.map((c) => html`
    <span class="change ${c.outcome ? 'outcome' : ''}">${c.label} <b>${c.text ? c.text : html`${c.from} → ${c.to}`}</b></span>`)}
    ${changes.length > shown.length ? html`<span class="change more">+${changes.length - shown.length}</span>` : ''}
  </div>`;
}

export function tagChips(tags = [], { limit = 99 } = {}) {
  if (!tags?.length) return '';
  const shown = tags.slice(0, limit);
  return html`<div class="tags">${shown.map((t) => html`<span class="tag" data-cat="${tagCategory(t)}">${t}</span>`)}${tags.length > shown.length ? html`<span class="tag more">+${tags.length - shown.length}</span>` : ''}</div>`;
}

export function brewCard(b, { showCoffee = true, prev = null, changes = true } = {}) {
  const c = coffeeById(b.coffee_id);
  const diff = changes ? diffBrews(b, prev) : [];
  return html`
    <a class="brew-card" href="#/brew/${b.id}">
      <div class="bc-score">${ratingBadge(b.rating)}${ratingDelta(b, prev)}</div>
      <div class="bc-body">
        <div class="bc-top">
          <span class="bc-title">${showCoffee ? c?.name || 'Unknown coffee' : recipeName(b.recipe_id)}</span>
          <span class="bc-date">${relDay(b.brewed_at)}</span>
        </div>
        <div class="bc-sub">${showCoffee ? html`${recipeName(b.recipe_id)}${c?.roaster ? html` · ${c.roaster}` : ''}` : ratingWord(b.rating)}</div>
        ${paramLine(b)}
        ${changeChips(diff, { limit: 3 })}
        ${tagChips(b.tags, { limit: 4 })}
      </div>
    </a>`;
}

// ---------- recipe → result comparison table ----------
export function compareTable(brews, { showCoffee = false, showRecipe = true, order = 'newest' } = {}) {
  if (!brews.length) return '';
  const prevMap = buildPrevMap();
  const best = Math.max(...brews.map((b) => b.rating ?? -1));
  const rows = [...brews].sort(order === 'best'
    ? (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || time(b.brewed_at) - time(a.brewed_at)
    : (a, b) => time(b.brewed_at) - time(a.brewed_at));
  // The variables you tweak most come first; names and keywords last.
  const cols = [
    { label: 'Grind', key: 'grind_setting', get: (b) => b.grind_setting || '' },
    { label: '°C', key: 'temp_c', get: (b) => fmtNum(b.temp_c) },
    { label: 'Dose', key: 'dose_g', get: (b) => fmtNum(b.dose_g) },
    { label: 'Water', key: 'water_g', get: (b) => fmtNum(b.water_g) },
    { label: 'Ratio', get: (b) => fmtRatio(ratio(b.dose_g, b.water_g)), same: ['dose_g', 'water_g'] },
    { label: 'Bloom', get: (b) => [b.bloom_water_g != null ? `${fmtNum(b.bloom_water_g)}g` : '', b.bloom_time_s != null ? `${b.bloom_time_s}s` : ''].filter(Boolean).join(' / '), same: ['bloom_water_g', 'bloom_time_s'] },
    { label: 'Time', key: 'total_time_s', get: (b) => fmtDuration(b.total_time_s) },
    showRecipe && { label: 'Recipe', key: 'recipe_id', get: (b) => recipeName(b.recipe_id), cls: 'wide' },
    showCoffee && { label: 'Coffee', get: (b) => coffeeName(b.coffee_id), cls: 'wide' },
    { label: 'Keywords', get: (b) => (b.tags || []).slice(0, 3).join(', '), cls: 'wide muted' },
  ].filter(Boolean);
  const changed = (col, b, prev) => {
    if (!prev) return false;
    const keys = col.same || (col.key ? [col.key] : []);
    return keys.some((k) => norm(b[k]) !== norm(prev[k]));
  };
  return html`
    <div class="table-wrap">
      <table class="compare">
        <thead><tr><th class="sticky">Score</th>${cols.map((c) => html`<th class="${c.cls || ''}">${c.label}</th>`)}</tr></thead>
        <tbody>${rows.map((b) => {
          const prev = prevMap.get(b.id);
          const isBest = b.rating != null && b.rating === best;
          return html`<tr data-href="#/brew/${b.id}" class="${isBest ? 'best' : ''}">
            <td class="sticky score"><b>${isBest ? icon('star', 'star') : ''}${fmtScore(b.rating)}</b><small>${shortDate(b.brewed_at)}</small></td>
            ${cols.map((c) => html`<td class="${c.cls || ''} ${changed(c, b, prev) ? 'changed' : ''}">${c.get(b) || '—'}</td>`)}
          </tr>`;
        })}</tbody>
      </table>
    </div>
    <p class="hint"><span class="swatch"></span> changed since the previous brew of that coffee · ${icon('star', 'star')} best score</p>`;
}

// ---------- coffees ----------
const PH_COLORS = ['#C98B5B', '#9E6B4A', '#B9785E', '#8E7355', '#C29A6B', '#A45D4B', '#7F6A57', '#B08463'];
export function coffeeThumb(c, size = 'md') {
  if (c?.photo_url) return html`<div class="thumb thumb-${size}"><img src="${c.photo_url}" alt="" loading="lazy"></div>`;
  const words = (c?.country || c?.name || '?').split(/\s+/);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  return html`<div class="thumb thumb-${size} ph" style="--ph:${PH_COLORS[hash(c?.name || '') % PH_COLORS.length]}"><span>${initials}</span></div>`;
}

export const originLine = (c) => [c.country, c.region].filter(Boolean).join(', ');

// ---------- feedback ----------
let toastTimer;
export function toast(msg, kind = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2600);
}

export function confirmSheet({ title, text = '', confirm = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal';
    el.innerHTML = html`
      <div class="sheet" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        ${text ? html`<p>${text}</p>` : ''}
        <div class="sheet-actions">
          <button class="btn btn-ghost" data-a="no">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="yes">${confirm}</button>
        </div>
      </div>`.s;
    const close = (ok) => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 200);
      resolve(ok);
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a) close(a === 'yes');
      else if (e.target === el) close(false);
    });
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
  });
}

// ---------- rating input (1–10 in 0.5 steps) ----------
export function ratingInputHTML(value) {
  return html`
    <div class="rating-input ${value == null ? 'unset' : ''}">
      <div class="ri-head">
        <div class="ri-num">${fmtScore(value)}</div>
        <div class="ri-word">${value == null ? 'Slide to rate your cup' : ratingWord(value)}</div>
      </div>
      <div class="ri-row">
        <button type="button" class="ri-step" data-step="-0.5" aria-label="Lower">−</button>
        <input type="range" min="1" max="10" step="0.5" value="${value ?? 7}" aria-label="Rating">
        <button type="button" class="ri-step" data-step="0.5" aria-label="Higher">+</button>
      </div>
      <div class="ri-scale"><span>1</span><span>5</span><span>10</span></div>
    </div>`;
}

export function bindRatingInput(el, initial, onChange) {
  let value = initial;
  const range = el.querySelector('input[type=range]');
  const set = (v) => {
    value = Math.max(1, Math.min(10, Math.round(v * 2) / 2));
    range.value = value;
    el.classList.remove('unset');
    el.querySelector('.ri-num').textContent = fmtScore(value);
    el.querySelector('.ri-word').textContent = ratingWord(value);
    el.style.setProperty('--p', ((value - 1) / 9) * 100);
    onChange(value);
  };
  el.style.setProperty('--p', (((value ?? 7) - 1) / 9) * 100);
  range.addEventListener('input', () => set(Number(range.value)));
  el.querySelectorAll('.ri-step').forEach((btn) => btn.addEventListener('click', () => set((value ?? 7) + Number(btn.dataset.step))));
}

// ---------- keyword picker ----------
export function mountTagPicker(el, selected, onChange) {
  const sel = new Set(selected || []);
  const open = new Set(TAG_GROUPS.filter((g) => g.open).map((g) => g.id));
  let query = '';

  el.innerHTML = html`
    <div class="tp-selected"></div>
    <div class="tp-search">${icon('search')}<input type="search" placeholder="Search or add a keyword…" autocomplete="off" enterkeyhint="done"></div>
    <div class="tp-add"></div>
    <div class="tp-groups"></div>`.s;
  const $sel = el.querySelector('.tp-selected');
  const $add = el.querySelector('.tp-add');
  const $groups = el.querySelector('.tp-groups');
  const $input = el.querySelector('input');

  const emit = () => onChange([...sel]);
  const chip = (t, cat) => html`<button type="button" class="tag ${sel.has(t) ? 'sel' : ''}" data-cat="${cat}" data-tag="${t}">${t}</button>`;

  function renderSelected() {
    $sel.innerHTML = (sel.size
      ? html`${[...sel].map((t) => html`<button type="button" class="tag sel" data-cat="${tagCategory(t)}" data-tag="${t}">${t}<span class="x">×</span></button>`)}`
      : html`<span class="hint">Nothing picked yet. Tap the keywords that describe the cup.</span>`).s;
  }
  function renderGroups() {
    const q = query.trim().toLowerCase();
    $groups.innerHTML = tagGroups().map((g) => {
      const tags = g.tags.filter((t) => !q || t.toLowerCase().includes(q));
      if (!tags.length) return '';
      const count = g.tags.filter((t) => sel.has(t)).length;
      return html`
        <details class="tp-group" data-group="${g.id}" ${q || open.has(g.id) ? 'open' : ''}>
          <summary><span class="dot" data-cat="${g.id}"></span>${g.label}${count ? html`<em>${count}</em>` : ''}</summary>
          <div class="tp-chips">${tags.map((t) => chip(t, g.id))}</div>
        </details>`.s;
    }).join('') || html`<p class="hint">No matching keyword.</p>`.s;
    const label = query.trim();
    $add.innerHTML = label && !findTag(label)
      ? html`<div class="tp-add-row">
          <span>Add <b>“${label}”</b> to</span>
          <select aria-label="Keyword group">${TAG_GROUPS.map((g) => html`<option value="${g.id}" ${g.id === 'other' ? 'selected' : ''}>${g.label}</option>`)}</select>
          <button type="button" class="btn btn-small btn-primary" data-add>Add</button>
        </div>`.s
      : '';
  }
  function toggle(t) {
    if (sel.has(t)) sel.delete(t); else sel.add(t);
    el.querySelectorAll(`.tp-groups [data-tag="${CSS.escape(t)}"]`).forEach((b) => b.classList.toggle('sel', sel.has(t)));
    renderSelected();
    updateCounts();
    emit();
  }
  function updateCounts() {
    for (const g of tagGroups()) {
      const summary = el.querySelector(`[data-group="${g.id}"] summary`);
      if (!summary) continue;
      const count = g.tags.filter((t) => sel.has(t)).length;
      let em = summary.querySelector('em');
      if (count && !em) { em = document.createElement('em'); summary.append(em); }
      if (em) { if (count) em.textContent = count; else em.remove(); }
    }
  }

  el.addEventListener('click', async (e) => {
    const tagBtn = e.target.closest('[data-tag]');
    if (tagBtn) { toggle(tagBtn.dataset.tag); return; }
    if (e.target.closest('[data-add]')) {
      const label = query.trim().replace(/^./, (c) => c.toUpperCase());
      const category = $add.querySelector('select').value;
      try {
        await save('tags', { label, category });
        open.add(category);
        query = '';
        $input.value = '';
        sel.add(label);
        renderGroups(); renderSelected(); emit();
        toast(`Added “${label}”`);
      } catch (err) { toast(err.message || 'Could not add keyword', 'error'); }
    }
  });
  el.addEventListener('toggle', (e) => {
    const g = e.target.closest?.('[data-group]');
    if (g && !query) { if (g.open) open.add(g.dataset.group); else open.delete(g.dataset.group); }
  }, true);
  $input.addEventListener('input', () => { query = $input.value; renderGroups(); });
  $input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const hit = findTag($input.value);
    if (hit) { if (!sel.has(hit)) toggle(hit); query = ''; $input.value = ''; renderGroups(); }
    else $add.querySelector('[data-add]')?.click();
  });

  renderSelected();
  renderGroups();
}

export { esc };
