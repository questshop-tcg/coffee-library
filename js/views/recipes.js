import { html, num, int, str, parseDuration, fmtNum, fmtRatio, ratio, fmtDuration, fmtScore, avg, uniq } from '../util.js';
import { state, recipeById, brewById, brewsOfRecipe, coffeeById, save, remove } from '../store.js';
import { go } from '../router.js';
import {
  icon, pageHead, emptyState, notFound, paramLine, ratingBadge, compareTable, coffeeThumb, confirmSheet, toast,
} from '../components.js';
import { FILTERS } from '../tags.js';

const ui = { order: 'newest' };

function stats(brews) {
  const rated = brews.filter((b) => b.rating != null).map((b) => b.rating);
  return { n: brews.length, avg: avg(rated), best: rated.length ? Math.max(...rated) : null };
}

// ---------- list ----------
export function recipeList(root) {
  const active = state.recipes.filter((r) => !r.archived);
  const archived = state.recipes.filter((r) => r.archived);
  const card = (r) => {
    const s = stats(brewsOfRecipe(r.id));
    return html`
      <a class="recipe-card" href="#/recipe/${r.id}">
        <div class="rc-body">
          <div class="rc-name">${r.name}</div>
          ${paramLine(r)}
          <div class="rc-foot">${s.n ? html`<span>${s.n} brew${s.n > 1 ? 's' : ''}</span><span>avg ${fmtNum(s.avg)}</span>` : html`<span>Not used yet</span>`}</div>
        </div>
        ${s.best != null ? html`<div class="cc-side">${ratingBadge(s.best, 'sm')}<small>best</small></div>` : ''}
      </a>`;
  };
  root.innerHTML = html`
    ${pageHead({ title: 'Recipes', eyebrow: `${active.length} recipe${active.length === 1 ? '' : 's'}`,
      actions: html`<a class="icon-btn filled" href="#/recipe/new" aria-label="Add recipe">${icon('plus')}</a>` })}
    ${state.recipes.length ? html`
      <div class="stack">${active.map(card)}</div>
      ${archived.length ? html`<details class="archived"><summary>Archived · ${archived.length}</summary><div class="stack">${archived.map(card)}</div></details>` : ''}`
      : emptyState({
        title: 'No recipes yet',
        text: 'Save the recipes you brew with. Each brew can start from one and you’ll see which gives the best cups.',
        action: html`<a class="btn btn-primary" href="#/recipe/new">${icon('cone')} Add a recipe</a>`,
        art: 'cone',
      })}`.s;
}

// ---------- detail ----------
export function recipeDetail(root, { id }) {
  const r = recipeById(id);
  if (!r) return notFound(root, 'recipe');
  const brews = brewsOfRecipe(r.id);
  const s = stats(brews);

  // Results per coffee
  const byCoffee = new Map();
  for (const b of brews) {
    if (!byCoffee.has(b.coffee_id)) byCoffee.set(b.coffee_id, []);
    byCoffee.get(b.coffee_id).push(b);
  }
  const perCoffee = [...byCoffee.entries()].map(([cid, bs]) => ({ c: coffeeById(cid), ...stats(bs) }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  const tiles = [
    ['Dose', r.dose_g != null && `${fmtNum(r.dose_g)} g`],
    ['Water', r.water_g != null && `${fmtNum(r.water_g)} g`],
    ['Ratio', fmtRatio(ratio(r.dose_g, r.water_g))],
    ['Grind', r.grind_setting, r.grinder],
    ['Temp', r.temp_c != null && `${fmtNum(r.temp_c)} °C`],
    ['Bloom', [r.bloom_water_g != null && `${fmtNum(r.bloom_water_g)} g`, r.bloom_time_s != null && `${r.bloom_time_s} s`].filter(Boolean).join(' · ')],
    ['Target time', r.target_time_s != null && fmtDuration(r.target_time_s)],
    ['Filter', r.filter],
    ['Water type', r.water],
  ].filter(([, v]) => v);

  root.innerHTML = html`
    ${pageHead({ back: '/recipes', eyebrow: r.archived ? 'Archived recipe' : 'Recipe', title: r.name,
      actions: html`<a class="icon-btn" href="#/recipe/${r.id}/edit" aria-label="Edit">${icon('edit')}</a>` })}

    <div class="stats">
      <div><b>${s.n}</b><span>brews</span></div>
      <div><b>${s.avg != null ? fmtNum(s.avg) : '–'}</b><span>average</span></div>
      <div><b>${s.best != null ? fmtScore(s.best) : '–'}</b><span>best</span></div>
    </div>

    <a class="btn btn-primary btn-block btn-lg" href="#/brew/new?recipe=${r.id}">${icon('plus')} Brew with this recipe</a>

    <section class="card">
      <h3 class="card-title">Parameters</h3>
      ${tiles.length ? html`<div class="param-grid">${tiles.map(([k, v, sub]) => html`<div class="param"><span>${k}</span><b>${v}</b>${sub ? html`<small>${sub}</small>` : ''}</div>`)}</div>` : html`<p class="hint">No parameters yet.</p>`}
      ${r.pours ? html`<div class="pours"><span>Pours</span><pre>${r.pours}</pre></div>` : ''}
      ${r.notes ? html`<p class="prose muted">${r.notes}</p>` : ''}
    </section>

    ${perCoffee.length ? html`
      <section class="section">
        <div class="section-head"><h2>Results by coffee</h2></div>
        <div class="stack">${perCoffee.map((p) => html`
          <a class="result-row" href="${p.c ? `#/coffee/${p.c.id}` : '#/coffees'}">
            ${coffeeThumb(p.c, 'sm')}
            <div class="rr-body"><div class="rr-name">${p.c?.name || 'Deleted coffee'}</div><div class="rr-meta">${p.n} brew${p.n > 1 ? 's' : ''} · avg ${fmtNum(p.avg) || '–'}</div></div>
            ${ratingBadge(p.best, 'sm')}
          </a>`)}</div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Every brew</h2>
          <div class="segmented small">
            <button type="button" data-order="newest" class="${ui.order === 'newest' ? 'on' : ''}">Newest</button>
            <button type="button" data-order="best" class="${ui.order === 'best' ? 'on' : ''}">Best</button>
          </div>
        </div>
        <div id="table">${compareTable(brews, { showCoffee: true, showRecipe: false, order: ui.order })}</div>
      </section>` : html`<p class="hint center">No brews with this recipe yet.</p>`}

    <div class="action-grid">
      <a class="btn btn-ghost" href="#/recipe/new?dup=${r.id}">${icon('copy')} Duplicate</a>
      <button class="btn btn-ghost" type="button" data-archive>${icon('archive')} ${r.archived ? 'Restore' : 'Archive'}</button>
      <button class="btn btn-ghost danger-text" type="button" data-delete>${icon('trash')} Delete</button>
    </div>`.s;

  root.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-order]');
    if (o) {
      ui.order = o.dataset.order;
      root.querySelectorAll('[data-order]').forEach((x) => x.classList.toggle('on', x === o));
      root.querySelector('#table').innerHTML = compareTable(brews, { showCoffee: true, showRecipe: false, order: ui.order }).s;
      return;
    }
    if (e.target.closest('[data-archive]')) {
      try {
        await save('recipes', { ...r, archived: !r.archived });
        toast(r.archived ? 'Recipe restored' : 'Recipe archived');
      } catch (err) { toast(err.message || 'Could not update', 'error'); }
      return;
    }
    if (e.target.closest('[data-delete]')) {
      const ok = await confirmSheet({
        title: `Delete “${r.name}”?`,
        text: brews.length ? `Your ${brews.length} brew${brews.length > 1 ? 's' : ''} keep their values but lose the link to this recipe. Archiving keeps it instead.` : 'This can’t be undone.',
      });
      if (!ok) return;
      try {
        await remove('recipes', r.id);
        toast('Recipe deleted');
        go('/recipes', { replace: true });
      } catch (err) { toast(err.message || 'Could not delete', 'error'); }
    }
  });
}

// ---------- form ----------
export function recipeForm(root, params, query) {
  const editing = params.id ? recipeById(params.id) : null;
  if (params.id && !editing) return notFound(root, 'recipe');
  let r = editing || {};
  if (!editing && query.from) {
    const b = brewById(query.from);
    if (b) {
      const { dose_g, water_g, grinder, grind_setting, temp_c, filter, water, bloom_water_g, bloom_time_s, pours, total_time_s } = b;
      r = { dose_g, water_g, grinder, grind_setting, temp_c, filter, water, bloom_water_g, bloom_time_s, pours, target_time_s: total_time_s };
    }
  }
  if (!editing && query.dup) {
    const src = recipeById(query.dup);
    if (src) { const { id, created_at, user_id, archived, ...rest } = src; r = { ...rest, name: `${src.name} (copy)` }; }
  }
  const grinders = uniq([...state.brews, ...state.recipes].map((x) => x.grinder));
  const filters = uniq([...FILTERS, ...state.recipes.map((x) => x.filter)]);
  const waters = uniq([...state.brews, ...state.recipes].map((x) => x.water));
  const numField = (name, label, unit, mode = 'decimal', placeholder = '') => html`
    <label class="field"><span class="label">${label}</span>
      <span class="input-unit"><input name="${name}" inputmode="${mode}" autocomplete="off" placeholder="${placeholder}" value="${fmtNum(r[name])}"><em>${unit}</em></span></label>`;

  root.innerHTML = html`
    ${pageHead({ title: editing ? 'Edit recipe' : 'New recipe', back: editing ? `/recipe/${editing.id}` : '/recipes' })}
    <form class="form" novalidate>
      <section class="form-section">
        <label class="field"><span class="label">Recipe name *</span>
          <input name="name" autocomplete="off" placeholder="e.g. Light roast, 2 pours" value="${r.name ?? ''}"></label>
      </section>
      <section class="form-section">
        <div class="form-section-head"><h3>Parameters</h3><span class="ratio-pill" id="ratio">${fmtRatio(ratio(r.dose_g, r.water_g)) || '1:–'}</span></div>
        <div class="grid-2">
          ${numField('dose_g', 'Dose', 'g', 'decimal', '15')}
          ${numField('water_g', 'Water', 'g', 'decimal', '250')}
          <label class="field"><span class="label">Grind setting</span><input name="grind_setting" autocomplete="off" placeholder="e.g. 22 clicks" value="${r.grind_setting ?? ''}"></label>
          ${numField('temp_c', 'Temperature', '°C', 'decimal', '94')}
          ${numField('bloom_water_g', 'Bloom water', 'g', 'decimal', '45')}
          ${numField('bloom_time_s', 'Bloom time', 's', 'numeric', '45')}
        </div>
        <label class="field"><span class="label">Pours</span>
          <textarea name="pours" rows="4" placeholder="0:00 bloom 45 g&#10;0:45 → 150 g&#10;1:15 → 250 g, gentle swirl">${r.pours ?? ''}</textarea></label>
        <label class="field"><span class="label">Target brew time</span>
          <span class="input-unit"><input name="target_time_s" inputmode="decimal" autocomplete="off" placeholder="m:ss, e.g. 3:00" value="${fmtDuration(r.target_time_s)}"><em>min</em></span></label>
        <label class="field"><span class="label">Grinder</span><input name="grinder" list="dl-grinders" autocomplete="off" placeholder="e.g. Comandante C40" value="${r.grinder ?? ''}"></label>
        <label class="field"><span class="label">Filter</span><input name="filter" list="dl-filters" autocomplete="off" placeholder="e.g. Hario V60 tabbed" value="${r.filter ?? ''}"></label>
        <label class="field"><span class="label">Water</span><input name="water" list="dl-waters" autocomplete="off" placeholder="e.g. Filtered tap" value="${r.water ?? ''}"></label>
        <label class="field"><span class="label">Notes</span><textarea name="notes" rows="3" placeholder="When to use it, what it’s good at…">${r.notes ?? ''}</textarea></label>
      </section>
      <div class="form-actions">
        <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check')} ${editing ? 'Save changes' : 'Save recipe'}</button>
      </div>
      <datalist id="dl-grinders">${grinders.map((x) => html`<option value="${x}">`)}</datalist>
      <datalist id="dl-filters">${filters.map((x) => html`<option value="${x}">`)}</datalist>
      <datalist id="dl-waters">${waters.map((x) => html`<option value="${x}">`)}</datalist>
    </form>`.s;

  const form = root.querySelector('form');
  const upd = () => { root.querySelector('#ratio').textContent = fmtRatio(ratio(num(form.elements.dose_g.value), num(form.elements.water_g.value))) || '1:–'; };
  form.elements.dose_g.addEventListener('input', upd);
  form.elements.water_g.addEventListener('input', upd);
  form.elements.target_time_s.addEventListener('blur', (e) => { const s = parseDuration(e.target.value); if (s != null) e.target.value = fmtDuration(s); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = str(f.get('name'));
    if (!name) { toast('Give the recipe a name', 'error'); form.elements.name.focus(); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const saved = await save('recipes', {
        ...(editing || {}),
        name,
        dose_g: num(f.get('dose_g')),
        water_g: num(f.get('water_g')),
        grinder: str(f.get('grinder')),
        grind_setting: str(f.get('grind_setting')),
        temp_c: num(f.get('temp_c')),
        filter: str(f.get('filter')),
        water: str(f.get('water')),
        bloom_water_g: num(f.get('bloom_water_g')),
        bloom_time_s: int(f.get('bloom_time_s')),
        pours: str(f.get('pours')),
        target_time_s: parseDuration(f.get('target_time_s')),
        notes: str(f.get('notes')),
        archived: editing?.archived ?? false,
      });
      toast(editing ? 'Recipe updated' : 'Recipe saved');
      go(`/recipe/${saved.id}`, { replace: true });
    } catch (err) {
      btn.disabled = false;
      toast(err.message || 'Could not save', 'error');
    }
  });
}
