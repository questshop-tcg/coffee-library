import { html, num, int, str, parseDuration, fmtNum, fmtDuration, fmtRatio, ratio, toLocalInput, relDay, fmtScore, uniq } from '../util.js';
import { state, brewById, coffeeById, recipeById, lastBrewOf, save } from '../store.js';
import { go } from '../router.js';
import { icon, pageHead, emptyState, notFound, ratingInputHTML, bindRatingInput, mountTagPicker, toast } from '../components.js';
import { FILTERS } from '../tags.js';

// Parameters copied between recipe, previous brew and this form.
const PARAMS = ['dose_g', 'water_g', 'grinder', 'grind_setting', 'temp_c', 'filter', 'water', 'bloom_water_g', 'bloom_time_s', 'pours'];

const pick = (src, keys) => Object.fromEntries(keys.map((k) => [k, src[k] ?? null]));

export function brewForm(root, params, query) {
  const editing = params.id ? brewById(params.id) : null;
  if (params.id && !editing) return notFound(root, 'brew');

  if (!state.coffees.length) {
    root.innerHTML = html`${pageHead({ title: 'Log a brew', back: '/' })}
      ${emptyState({ title: 'Add a coffee first', text: 'Every brew belongs to a coffee. Add the beans you’re brewing, then log your cup.',
        action: html`<a class="btn btn-primary" href="#/coffee/new">${icon('bean')} Add a coffee</a>`, art: 'bean' })}`.s;
    return;
  }

  // ----- initial values -----
  let data;
  let banner = null;
  if (editing) {
    data = { ...editing, tags: [...(editing.tags || [])] };
  } else {
    data = { brewed_at: new Date().toISOString(), tags: [], rating: null, coffee_id: null, recipe_id: null };
    const from = query.from && brewById(query.from);
    if (from) {
      Object.assign(data, pick(from, ['coffee_id', 'recipe_id', ...PARAMS]));
      banner = fromBanner(from, 'Copied from your brew');
    } else {
      const lastActive = state.brews.find((b) => coffeeById(b.coffee_id)?.status !== 'finished');
      data.coffee_id = query.coffee || lastActive?.coffee_id
        || state.coffees.find((c) => c.status !== 'finished')?.id || state.coffees[0].id;
      const lb = lastBrewOf(data.coffee_id);
      if (lb && !query.recipe) {
        Object.assign(data, pick(lb, ['recipe_id', ...PARAMS]));
        banner = fromBanner(lb, 'Pre-filled from your last brew of this coffee');
      }
      const r = query.recipe && recipeById(query.recipe);
      if (r) { Object.assign(data, recipeValues(r)); banner = null; }
    }
  }
  const lastTime = !editing && data.coffee_id ? lastBrewOf(data.coffee_id)?.total_time_s : null;

  const active = state.coffees.filter((c) => c.status !== 'finished' || c.id === data.coffee_id);
  const finished = state.coffees.filter((c) => c.status === 'finished' && c.id !== data.coffee_id);
  const recipes = state.recipes.filter((r) => !r.archived || r.id === data.recipe_id);
  const grinders = uniq([...state.brews, ...state.recipes].map((x) => x.grinder));
  const filters = uniq([...FILTERS, ...state.brews.map((b) => b.filter)]);
  const waters = uniq([...state.brews, ...state.recipes].map((x) => x.water));

  const coffeeOption = (c) => html`<option value="${c.id}" ${c.id === data.coffee_id ? 'selected' : ''}>${c.name}${c.roaster ? ` · ${c.roaster}` : ''}</option>`;
  const numField = (name, label, unit, mode = 'decimal', placeholder = '') => html`
    <label class="field">
      <span class="label">${label}</span>
      <span class="input-unit"><input name="${name}" inputmode="${mode}" autocomplete="off" placeholder="${placeholder}" value="${fmtField(name, data[name])}"><em>${unit}</em></span>
    </label>`;

  root.innerHTML = html`
    ${pageHead({ title: editing ? 'Edit brew' : 'Log a brew', eyebrow: editing ? relDay(editing.brewed_at) : 'V60', back: editing ? `/brew/${editing.id}` : '/' })}
    <form class="form" id="brew-form" novalidate>
      <div id="banner">${bannerHTML(banner)}</div>

      <section class="form-section">
        <h3>Coffee & recipe</h3>
        <label class="field">
          <span class="label">Coffee</span>
          <select name="coffee_id">
            ${active.map(coffeeOption)}
            ${finished.length ? html`<optgroup label="Finished">${finished.map(coffeeOption)}</optgroup>` : ''}
          </select>
        </label>
        <label class="field">
          <span class="label">Recipe</span>
          <select name="recipe_id">
            <option value="">Own recipe (not saved)</option>
            ${recipes.map((r) => html`<option value="${r.id}" ${r.id === data.recipe_id ? 'selected' : ''}>${r.name}</option>`)}
          </select>
        </label>
        <label class="field">
          <span class="label">Brewed</span>
          <input type="datetime-local" name="brewed_at" value="${toLocalInput(data.brewed_at)}">
        </label>
      </section>

      <section class="form-section">
        <div class="form-section-head"><h3>Parameters</h3><span class="ratio-pill" id="ratio">${fmtRatio(ratio(data.dose_g, data.water_g)) || '1:–'}</span></div>
        <div class="grid-2">
          ${numField('dose_g', 'Dose', 'g', 'decimal', '15')}
          ${numField('water_g', 'Water', 'g', 'decimal', '250')}
          <label class="field">
            <span class="label">Grind setting</span>
            <input name="grind_setting" autocomplete="off" placeholder="e.g. 22 clicks" value="${data.grind_setting ?? ''}">
          </label>
          ${numField('temp_c', 'Temperature', '°C', 'decimal', '94')}
          ${numField('bloom_water_g', 'Bloom water', 'g', 'decimal', '45')}
          ${numField('bloom_time_s', 'Bloom time', 's', 'numeric', '45')}
        </div>
        <label class="field">
          <span class="label">Pours</span>
          <textarea name="pours" rows="3" placeholder="0:45 → 150 g&#10;1:15 → 250 g, swirl">${data.pours ?? ''}</textarea>
        </label>
        <label class="field">
          <span class="label">Total brew time</span>
          <span class="input-unit"><input name="total_time_s" inputmode="decimal" autocomplete="off" placeholder="${lastTime ? `last: ${fmtDuration(lastTime)}` : 'm:ss, e.g. 3:05'}" value="${fmtDuration(data.total_time_s)}"><em>min</em></span>
        </label>
        <details class="more" ${data.grinder || data.filter || data.water ? 'open' : ''}>
          <summary>Grinder, filter & water</summary>
          <label class="field"><span class="label">Grinder</span><input name="grinder" list="dl-grinders" autocomplete="off" placeholder="e.g. Comandante C40" value="${data.grinder ?? ''}"></label>
          <label class="field"><span class="label">Filter</span><input name="filter" list="dl-filters" autocomplete="off" placeholder="e.g. Hario V60 tabbed" value="${data.filter ?? ''}"></label>
          <label class="field"><span class="label">Water</span><input name="water" list="dl-waters" autocomplete="off" placeholder="e.g. Filtered tap, Third Wave Water" value="${data.water ?? ''}"></label>
        </details>
      </section>

      <section class="form-section">
        <h3>How was it?</h3>
        <div id="rating">${ratingInputHTML(data.rating)}</div>
        <div class="field">
          <span class="label">Keywords</span>
          <div id="tags" class="tag-picker"></div>
        </div>
        <label class="field">
          <span class="label">Tasting notes</span>
          <textarea name="notes" rows="3" placeholder="What did you taste? How did it change as it cooled?">${data.notes ?? ''}</textarea>
        </label>
        <label class="field">
          <span class="label">Next time, try…</span>
          <textarea name="next_time" rows="2" placeholder="e.g. grind 2 clicks finer, 1 °C hotter">${data.next_time ?? ''}</textarea>
        </label>
      </section>

      <div class="form-actions">
        <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check')} ${editing ? 'Save changes' : 'Save brew'}</button>
      </div>

      <datalist id="dl-grinders">${grinders.map((g) => html`<option value="${g}">`)}</datalist>
      <datalist id="dl-filters">${filters.map((f) => html`<option value="${f}">`)}</datalist>
      <datalist id="dl-waters">${waters.map((w) => html`<option value="${w}">`)}</datalist>
    </form>`.s;

  const form = root.querySelector('form');
  const el = (name) => form.elements[name];

  bindRatingInput(root.querySelector('.rating-input'), data.rating, (v) => { data.rating = v; });
  mountTagPicker(root.querySelector('#tags'), data.tags, (tags) => { data.tags = tags; });

  const updateRatio = () => {
    root.querySelector('#ratio').textContent = fmtRatio(ratio(num(el('dose_g').value), num(el('water_g').value))) || '1:–';
  };
  el('dose_g').addEventListener('input', updateRatio);
  el('water_g').addEventListener('input', updateRatio);

  // Show how a typed time was understood ("3,05" -> "3:05").
  el('total_time_s').addEventListener('blur', (e) => {
    const s = parseDuration(e.target.value);
    if (s != null) e.target.value = fmtDuration(s);
  });

  const fill = (values) => {
    for (const k of PARAMS) if (k in values) el(k).value = fmtField(k, values[k]);
    if ('recipe_id' in values) el('recipe_id').value = values.recipe_id || '';
    if (values.grinder || values.filter || values.water) form.querySelector('details.more').open = true;
    updateRatio();
  };
  const setBanner = (b) => { root.querySelector('#banner').innerHTML = bannerHTML(b).s; };

  if (!editing) {
    el('coffee_id').addEventListener('change', () => {
      const lb = lastBrewOf(el('coffee_id').value);
      if (lb) {
        fill(pick(lb, ['recipe_id', ...PARAMS]));
        setBanner(fromBanner(lb, 'Pre-filled from your last brew of this coffee'));
        el('total_time_s').placeholder = lb.total_time_s ? `last: ${fmtDuration(lb.total_time_s)}` : 'm:ss, e.g. 3:05';
      } else {
        setBanner(null);
      }
    });
  }
  el('recipe_id').addEventListener('change', () => {
    const r = recipeById(el('recipe_id').value);
    if (!r) return;
    fill(recipeValues(r));
    setBanner({ text: `Loaded the values from “${r.name}”. Adjust anything you changed.` });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (data.rating == null) {
      toast('Give your cup a score first', 'error');
      root.querySelector('#rating').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const f = new FormData(form);
    const brewedAt = new Date(f.get('brewed_at'));
    const row = {
      ...(editing || {}),
      coffee_id: f.get('coffee_id'),
      recipe_id: f.get('recipe_id') || null,
      brewed_at: Number.isNaN(brewedAt.getTime()) ? new Date().toISOString() : brewedAt.toISOString(),
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
      total_time_s: parseDuration(f.get('total_time_s')),
      rating: data.rating,
      tags: data.tags,
      notes: str(f.get('notes')),
      next_time: str(f.get('next_time')),
    };
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const saved = await save('brews', row);
      toast(editing ? 'Brew updated' : 'Brew saved. Enjoy your cup ☕');
      go(`/brew/${saved.id}`, { replace: true });
    } catch (err) {
      btn.disabled = false;
      toast(err.message || 'Could not save', 'error');
    }
  });
}

function recipeValues(r) {
  const v = { recipe_id: r.id };
  for (const k of PARAMS) if (r[k] != null && r[k] !== '') v[k] = r[k];
  return v;
}

function fmtField(name, value) {
  if (value == null) return '';
  if (name === 'total_time_s') return fmtDuration(value);
  if (typeof value === 'number') return fmtNum(value);
  return value;
}

function fromBanner(b, prefix) {
  return { text: `${prefix} (${relDay(b.brewed_at)}, scored ${fmtScore(b.rating)}). Only change what you did differently.`, note: b.next_time };
}

function bannerHTML(b) {
  if (!b) return html``;
  return html`<div class="banner">
    <p>${b.text}</p>
    ${b.note ? html`<p class="banner-note">${icon('note')}<span>Your note: <b>“${b.note}”</b></span></p>` : ''}
  </div>`;
}
