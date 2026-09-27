import { html, num, str, daysSince, fmtNum, fmtScore, avg, uniq, resizeImage, shortDate } from '../util.js';
import { state, coffeeById, brewsOfCoffee, save, remove, uploadPhoto, deletePhoto } from '../store.js';
import { go } from '../router.js';
import {
  icon, pageHead, emptyState, notFound, coffeeThumb, originLine, ratingBadge, brewCard, buildPrevMap, compareTable,
  paramLine, recipeName, confirmSheet, toast,
} from '../components.js';
import { PROCESSES, ROAST_LEVELS, ORIGINS, VARIETIES } from '../tags.js';

const ui = { filter: 'active', query: '', view: 'list', order: 'newest' };

// ---------- list ----------
export function coffeeList(root) {
  const counts = {
    active: state.coffees.filter((c) => c.status !== 'finished').length,
    finished: state.coffees.filter((c) => c.status === 'finished').length,
  };
  root.innerHTML = html`
    ${pageHead({ title: 'Coffees', eyebrow: `${counts.active} on the shelf`,
      actions: html`<a class="icon-btn filled" href="#/coffee/new" aria-label="Add coffee">${icon('plus')}</a>` })}
    ${state.coffees.length ? html`
      <div class="segmented" role="tablist">
        ${[['active', `On the shelf · ${counts.active}`], ['finished', `Finished · ${counts.finished}`], ['all', 'All']].map(([k, label]) => html`
          <button type="button" data-filter="${k}" class="${ui.filter === k ? 'on' : ''}">${label}</button>`)}
      </div>
      <div class="search">${icon('search')}<input type="search" placeholder="Name, roaster, origin, process…" value="${ui.query}" autocomplete="off"></div>
      <div id="coffee-list" class="stack"></div>` : emptyState({
        title: 'No coffees yet',
        text: 'Add the beans you’re drinking: roaster, origin, process, roast date and the notes on the bag.',
        action: html`<a class="btn btn-primary" href="#/coffee/new">${icon('bean')} Add a coffee</a>`,
        art: 'bean',
      })}`.s;

  const list = root.querySelector('#coffee-list');
  if (!list) return;
  const render = () => {
    const q = ui.query.trim().toLowerCase();
    const coffees = state.coffees.filter((c) => {
      if (ui.filter === 'active' && c.status === 'finished') return false;
      if (ui.filter === 'finished' && c.status !== 'finished') return false;
      if (!q) return true;
      return [c.name, c.roaster, c.country, c.region, c.process, c.variety, c.farm, c.producer, c.bag_notes].some((x) => x && x.toLowerCase().includes(q));
    });
    list.innerHTML = coffees.length ? coffees.map((c) => coffeeCard(c).s).join('')
      : html`<p class="hint center">${q ? `No coffees match “${ui.query}”.` : 'Nothing here yet.'}</p>`.s;
  };
  root.querySelector('.segmented').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    ui.filter = b.dataset.filter;
    root.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('on', x === b));
    render();
  });
  root.querySelector('.search input').addEventListener('input', (e) => { ui.query = e.target.value; render(); });
  render();
}

function coffeeCard(c) {
  const brews = brewsOfCoffee(c.id);
  const best = brews.length ? Math.max(...brews.map((b) => b.rating ?? 0)) : null;
  const days = daysSince(c.roast_date);
  return html`
    <a class="coffee-card ${c.status === 'finished' ? 'finished' : ''}" href="#/coffee/${c.id}">
      ${coffeeThumb(c)}
      <div class="cc-body">
        ${c.roaster ? html`<div class="cc-roaster">${c.roaster}</div>` : ''}
        <div class="cc-name">${c.name}</div>
        <div class="cc-meta">${[originLine(c), c.process].filter(Boolean).join(' · ') || ' '}</div>
        <div class="cc-foot">
          ${days != null && c.status !== 'finished' ? html`<span>Day ${days} off roast</span>` : ''}
          <span>${brews.length ? `${brews.length} brew${brews.length > 1 ? 's' : ''}` : 'Not brewed yet'}</span>
        </div>
      </div>
      ${best ? html`<div class="cc-side">${ratingBadge(best, 'sm')}<small>best</small></div>` : ''}
    </a>`;
}

// ---------- detail ----------
export function coffeeDetail(root, { id }) {
  const c = coffeeById(id);
  if (!c) return notFound(root, 'coffee');
  const brews = brewsOfCoffee(c.id);
  const rated = brews.filter((b) => b.rating != null);
  const best = rated.length ? rated.reduce((a, b) => (b.rating > a.rating || (b.rating === a.rating && b.brewed_at > a.brewed_at) ? b : a)) : null;
  const days = daysSince(c.roast_date);
  const prevMap = buildPrevMap();
  const attrs = [
    ['Origin', originLine(c)], ['Farm', c.farm], ['Producer', c.producer], ['Variety', c.variety],
    ['Process', c.process], ['Altitude', c.altitude], ['Roast', c.roast_level],
    ['Roasted', c.roast_date && `${shortDate(c.roast_date)}${days != null ? ` · ${days} days ago` : ''}`],
    ['Bag', [c.weight_g && `${fmtNum(c.weight_g)} g`, c.price != null && `€${Number(c.price).toFixed(2)}`].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v);

  root.innerHTML = html`
    ${pageHead({ back: '/coffees', title: '', actions: html`<a class="icon-btn" href="#/coffee/${c.id}/edit" aria-label="Edit">${icon('edit')}</a>` })}
    <section class="coffee-hero">
      ${coffeeThumb(c, 'xl')}
      <div class="coffee-hero-text">
        ${c.roaster ? html`<div class="eyebrow">${c.roaster}</div>` : ''}
        <h1 class="display">${c.name}</h1>
        ${c.status === 'finished' ? html`<span class="pill">Finished</span>` : ''}
      </div>
    </section>

    <div class="stats">
      <div><b>${days ?? '–'}</b><span>days off roast</span></div>
      <div><b>${brews.length}</b><span>brews</span></div>
      <div><b>${best ? fmtScore(best.rating) : '–'}</b><span>best</span></div>
      <div><b>${rated.length ? fmtNum(avg(rated.map((b) => b.rating))) : '–'}</b><span>average</span></div>
    </div>

    <a class="btn btn-primary btn-block btn-lg" href="#/brew/new?coffee=${c.id}">${icon('plus')} Log a brew with this coffee</a>

    ${best && brews.length > 1 ? html`
      <section class="best-card">
        <div class="best-head">${icon('star')} Your best cup so far</div>
        <div class="best-body">
          ${ratingBadge(best.rating)}
          <div>
            <div class="best-recipe">${recipeName(best.recipe_id)} · ${shortDate(best.brewed_at)}</div>
            ${paramLine(best)}
          </div>
        </div>
        <a class="btn btn-cream btn-block" href="#/brew/new?from=${best.id}">${icon('repeat')} Brew this again</a>
      </section>` : ''}

    ${c.bag_notes ? html`<section class="card"><h3 class="card-title">On the bag</h3><p class="bag-notes">${c.bag_notes}</p></section>` : ''}

    ${attrs.length ? html`<section class="card"><h3 class="card-title">Details</h3>
      <dl class="kv">${attrs.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
      ${c.notes ? html`<p class="prose muted">${c.notes}</p>` : ''}
    </section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Brews</h2>
        ${brews.length > 1 ? html`<div class="segmented small" data-group="view">
          <button type="button" data-view="list" class="${ui.view === 'list' ? 'on' : ''}">Timeline</button>
          <button type="button" data-view="table" class="${ui.view === 'table' ? 'on' : ''}">Compare</button>
        </div>` : ''}
      </div>
      <div id="brews"></div>
    </section>

    <div class="action-grid">
      <button class="btn btn-ghost" type="button" data-status>${icon(c.status === 'finished' ? 'bean' : 'archive')} ${c.status === 'finished' ? 'Back on the shelf' : 'Mark bag as finished'}</button>
      <button class="btn btn-ghost danger-text" type="button" data-delete>${icon('trash')} Delete coffee</button>
    </div>`.s;

  const box = root.querySelector('#brews');
  const renderBrews = () => {
    if (!brews.length) {
      box.innerHTML = html`<p class="hint">No brews with this coffee yet.</p>`.s;
      return;
    }
    if (ui.view === 'table' && brews.length > 1) {
      box.innerHTML = html`
        <div class="table-tools">
          <span class="hint">Sort</span>
          <div class="segmented small">
            <button type="button" data-order="newest" class="${ui.order === 'newest' ? 'on' : ''}">Newest</button>
            <button type="button" data-order="best" class="${ui.order === 'best' ? 'on' : ''}">Best</button>
          </div>
        </div>
        ${compareTable(brews, { order: ui.order })}`.s;
    } else {
      box.innerHTML = html`<div class="stack">${brews.map((b) => brewCard(b, { showCoffee: false, prev: prevMap.get(b.id) }))}</div>`.s;
    }
  };
  renderBrews();

  root.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]');
    if (v) {
      ui.view = v.dataset.view;
      root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === v));
      renderBrews();
      return;
    }
    const o = e.target.closest('[data-order]');
    if (o) { ui.order = o.dataset.order; renderBrews(); return; }
    if (e.target.closest('[data-status]')) {
      try {
        await save('coffees', { ...c, status: c.status === 'finished' ? 'active' : 'finished' });
        toast(c.status === 'finished' ? 'Back on the shelf' : 'Marked as finished');
      } catch (err) { toast(err.message || 'Could not update', 'error'); }
      return;
    }
    if (e.target.closest('[data-delete]')) {
      const ok = await confirmSheet({
        title: `Delete ${c.name}?`,
        text: brews.length ? `This also deletes its ${brews.length} brew${brews.length > 1 ? 's' : ''}. This can’t be undone.` : 'This can’t be undone.',
      });
      if (!ok) return;
      try {
        await remove('coffees', c.id);
        deletePhoto(c.photo_url);
        toast('Coffee deleted');
        go('/coffees', { replace: true });
      } catch (err) { toast(err.message || 'Could not delete', 'error'); }
    }
  });
}

// ---------- form ----------
export function coffeeForm(root, params) {
  const editing = params.id ? coffeeById(params.id) : null;
  if (params.id && !editing) return notFound(root, 'coffee');
  const c = editing || { status: 'active' };
  let photoBlob = null;
  let photoRemoved = false;

  const roasters = uniq(state.coffees.map((x) => x.roaster));
  const origins = uniq([...ORIGINS, ...state.coffees.map((x) => x.country)]);
  const processes = uniq([...PROCESSES, ...state.coffees.map((x) => x.process)]);
  const varieties = uniq([...VARIETIES, ...state.coffees.map((x) => x.variety)]);
  const text = (name, label, placeholder = '', list = '') => html`
    <label class="field"><span class="label">${label}</span>
      <input name="${name}" autocomplete="off" placeholder="${placeholder}" ${list ? html`list="${list}"` : ''} value="${c[name] ?? ''}"></label>`;

  root.innerHTML = html`
    ${pageHead({ title: editing ? 'Edit coffee' : 'New coffee', back: editing ? `/coffee/${editing.id}` : '/coffees' })}
    <form class="form" novalidate>
      <section class="form-section">
        <div class="photo-pick">
          <label class="photo-tile ${c.photo_url ? 'has-photo' : ''}">
            ${c.photo_url ? html`<img src="${c.photo_url}" alt="">` : ''}
            <span class="photo-empty">${icon('camera')}<span>Add bag photo</span></span>
            <input type="file" accept="image/*" hidden>
          </label>
          <button type="button" class="btn btn-small btn-ghost" data-remove-photo ${c.photo_url ? '' : 'hidden'}>Remove photo</button>
        </div>
        <label class="field"><span class="label">Coffee name *</span>
          <input name="name" required autocomplete="off" placeholder="e.g. Gesha Village Lot 74" value="${c.name ?? ''}"></label>
        ${text('roaster', 'Roaster', 'e.g. Tim Wendelboe', 'dl-roasters')}
      </section>

      <section class="form-section">
        <h3>Origin</h3>
        <div class="grid-2">
          ${text('country', 'Country', 'Ethiopia', 'dl-origins')}
          ${text('region', 'Region', 'Guji')}
          ${text('farm', 'Farm / washing station', '')}
          ${text('producer', 'Producer', '')}
          ${text('variety', 'Variety', 'Gesha', 'dl-varieties')}
          ${text('altitude', 'Altitude', '1900–2100 m')}
        </div>
      </section>

      <section class="form-section">
        <h3>Process & roast</h3>
        ${text('process', 'Process', 'Washed', 'dl-processes')}
        <div class="field">
          <span class="label">Roast level</span>
          <div class="choice">${ROAST_LEVELS.map((r) => html`
            <label><input type="radio" name="roast_level" value="${r}" ${c.roast_level === r ? 'checked' : ''}><span>${r}</span></label>`)}</div>
        </div>
        <label class="field"><span class="label">Roast date</span><input type="date" name="roast_date" value="${c.roast_date ?? ''}"></label>
        <label class="field"><span class="label">Tasting notes on the bag</span>
          <input name="bag_notes" autocomplete="off" placeholder="e.g. Jasmine, peach, bergamot" value="${c.bag_notes ?? ''}"></label>
      </section>

      <section class="form-section">
        <h3>Bag</h3>
        <div class="grid-2">
          <label class="field"><span class="label">Weight</span><span class="input-unit"><input name="weight_g" inputmode="decimal" placeholder="250" value="${fmtNum(c.weight_g)}"><em>g</em></span></label>
          <label class="field"><span class="label">Price</span><span class="input-unit"><input name="price" inputmode="decimal" placeholder="18.50" value="${c.price != null ? Number(c.price).toFixed(2) : ''}"><em>€</em></span></label>
        </div>
        <label class="field"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Where you bought it, who recommended it…">${c.notes ?? ''}</textarea></label>
        ${editing ? html`<label class="switch"><input type="checkbox" name="finished" ${c.status === 'finished' ? 'checked' : ''}><span>Bag is finished</span></label>` : ''}
      </section>

      <div class="form-actions">
        <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check')} ${editing ? 'Save changes' : 'Add coffee'}</button>
      </div>

      <datalist id="dl-roasters">${roasters.map((x) => html`<option value="${x}">`)}</datalist>
      <datalist id="dl-origins">${origins.map((x) => html`<option value="${x}">`)}</datalist>
      <datalist id="dl-processes">${processes.map((x) => html`<option value="${x}">`)}</datalist>
      <datalist id="dl-varieties">${varieties.map((x) => html`<option value="${x}">`)}</datalist>
    </form>`.s;

  const form = root.querySelector('form');
  const tile = root.querySelector('.photo-tile');
  const removeBtn = root.querySelector('[data-remove-photo]');
  const showPhoto = (src) => {
    tile.querySelector('img')?.remove();
    if (src) { const img = document.createElement('img'); img.src = src; img.alt = ''; tile.prepend(img); }
    tile.classList.toggle('has-photo', Boolean(src));
    removeBtn.hidden = !src;
  };
  tile.querySelector('input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      photoBlob = await resizeImage(file, state.mode === 'local' ? 700 : 1400, state.mode === 'local' ? 0.72 : 0.82);
      showPhoto(URL.createObjectURL(photoBlob));
    } catch { toast('Could not read that photo', 'error'); }
  });
  removeBtn.addEventListener('click', () => { photoBlob = null; photoRemoved = true; showPhoto(null); });

  // Allow unticking a roast level.
  form.querySelectorAll('.choice input').forEach((r) => r.addEventListener('click', () => {
    if (r.dataset.was === 'on') { r.checked = false; r.dataset.was = ''; }
    else { form.querySelectorAll('.choice input').forEach((x) => { x.dataset.was = ''; }); r.dataset.was = 'on'; }
  }));
  form.querySelectorAll('.choice input:checked').forEach((r) => { r.dataset.was = 'on'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = str(f.get('name'));
    if (!name) { toast('Give the coffee a name', 'error'); form.elements.name.focus(); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      let photo_url = photoRemoved ? null : c.photo_url ?? null;
      if (photoBlob) photo_url = await uploadPhoto(photoBlob);
      const saved = await save('coffees', {
        ...(editing || {}),
        name,
        roaster: str(f.get('roaster')),
        country: str(f.get('country')),
        region: str(f.get('region')),
        farm: str(f.get('farm')),
        producer: str(f.get('producer')),
        variety: str(f.get('variety')),
        altitude: str(f.get('altitude')),
        process: str(f.get('process')),
        roast_level: str(f.get('roast_level')),
        roast_date: str(f.get('roast_date')),
        bag_notes: str(f.get('bag_notes')),
        weight_g: num(f.get('weight_g')),
        price: num(f.get('price')),
        notes: str(f.get('notes')),
        status: editing ? (f.get('finished') ? 'finished' : 'active') : 'active',
        photo_url,
      });
      if (editing?.photo_url && editing.photo_url !== photo_url) deletePhoto(editing.photo_url);
      toast(editing ? 'Coffee updated' : 'Coffee added');
      go(`/coffee/${saved.id}`, { replace: true });
    } catch (err) {
      btn.disabled = false;
      toast(err.message || 'Could not save', 'error');
    }
  });
}
