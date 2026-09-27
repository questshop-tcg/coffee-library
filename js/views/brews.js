import { html, longDate, clock, monthLabel, fmtNum, fmtRatio, ratio, fmtDuration, ratingWord, relDay, fmtScore } from '../util.js';
import { state, brewById, coffeeById, recipeById, remove } from '../store.js';
import { go } from '../router.js';
import {
  icon, pageHead, emptyState, notFound, brewCard, buildPrevMap, ratingBadge, ratingDelta, diffBrews, changeChips,
  tagChips, recipeName, confirmSheet, toast,
} from '../components.js';

let listQuery = '';

export function brewList(root) {
  const prevMap = buildPrevMap();
  root.innerHTML = html`
    ${pageHead({ title: 'Brews', eyebrow: `${state.brews.length} cup${state.brews.length === 1 ? '' : 's'} logged`,
      actions: html`<a class="icon-btn filled" href="#/brew/new" aria-label="Log a brew">${icon('plus')}</a>` })}
    ${state.brews.length ? html`
      <div class="search">${icon('search')}<input type="search" placeholder="Coffee, recipe, keyword…" value="${listQuery}" autocomplete="off"></div>
      <div id="brew-list"></div>` : emptyState({
        title: 'No brews yet',
        text: 'After your next V60, log it here with the recipe you used and how it tasted.',
        action: html`<a class="btn btn-primary" href="#/brew/new">${icon('plus')} Log a brew</a>`,
        art: 'cone',
      })}`.s;

  const list = root.querySelector('#brew-list');
  if (!list) return;
  const render = () => {
    const q = listQuery.trim().toLowerCase();
    const brews = state.brews.filter((b) => {
      if (!q) return true;
      const c = coffeeById(b.coffee_id);
      return [c?.name, c?.roaster, c?.country, recipeName(b.recipe_id), b.notes, ...(b.tags || [])]
        .some((x) => x && x.toLowerCase().includes(q));
    });
    let month = null;
    list.innerHTML = brews.length
      ? brews.map((b) => {
          const m = monthLabel(b.brewed_at);
          const head = m !== month ? html`<h3 class="month">${m}</h3>` : '';
          month = m;
          return html`${head}${brewCard(b, { prev: prevMap.get(b.id) })}`.s;
        }).join('')
      : html`<p class="hint center">No brews match “${listQuery}”.</p>`.s;
  };
  root.querySelector('.search input').addEventListener('input', (e) => { listQuery = e.target.value; render(); });
  render();
}

function paramGrid(b) {
  const tiles = [
    ['Dose', b.dose_g != null && `${fmtNum(b.dose_g)} g`],
    ['Water', b.water_g != null && `${fmtNum(b.water_g)} g`],
    ['Ratio', fmtRatio(ratio(b.dose_g, b.water_g))],
    ['Grind', b.grind_setting, b.grinder],
    ['Temp', b.temp_c != null && `${fmtNum(b.temp_c)} °C`],
    ['Bloom', [b.bloom_water_g != null && `${fmtNum(b.bloom_water_g)} g`, b.bloom_time_s != null && `${b.bloom_time_s} s`].filter(Boolean).join(' · ')],
    ['Total time', b.total_time_s != null && fmtDuration(b.total_time_s)],
    ['Filter', b.filter],
    ['Water type', b.water],
  ].filter(([, v]) => v);
  if (!tiles.length) return html`<p class="hint">No parameters recorded.</p>`;
  return html`<div class="param-grid">${tiles.map(([k, v, sub]) => html`
    <div class="param"><span>${k}</span><b>${v}</b>${sub ? html`<small>${sub}</small>` : ''}</div>`)}</div>`;
}

export function brewDetail(root, { id }) {
  const b = brewById(id);
  if (!b) return notFound(root, 'brew');
  const c = coffeeById(b.coffee_id);
  const r = recipeById(b.recipe_id);
  const prev = buildPrevMap().get(b.id);
  const changes = diffBrews(b, prev);

  root.innerHTML = html`
    ${pageHead({ back: c ? `/coffee/${c.id}` : '/brews', eyebrow: `${longDate(b.brewed_at)} · ${clock(b.brewed_at)}`, title: c?.name || 'Unknown coffee',
      actions: html`<a class="icon-btn" href="#/brew/${b.id}/edit" aria-label="Edit">${icon('edit')}</a>` })}

    <section class="card score-card">
      ${ratingBadge(b.rating, 'lg')}
      <div>
        <div class="score-word">${ratingWord(b.rating)} ${ratingDelta(b, prev)}</div>
        <div class="score-links">
          ${c ? html`<a href="#/coffee/${c.id}">${c.roaster ? `${c.roaster} · ` : ''}${c.name}</a>` : ''}
          ${r ? html`<a href="#/recipe/${r.id}">${icon('cone')} ${r.name}</a>` : html`<span>${icon('cone')} ${recipeName(b.recipe_id)}</span>`}
        </div>
      </div>
    </section>

    ${b.tags?.length ? html`<section class="block">${tagChips(b.tags)}</section>` : ''}

    ${b.notes ? html`<section class="card"><h3 class="card-title">Tasting notes</h3><p class="prose">${b.notes}</p></section>` : ''}
    ${b.next_time ? html`<section class="callout">${icon('note')}<div><span>Next time</span>${b.next_time}</div></section>` : ''}

    <section class="card">
      <h3 class="card-title">Recipe as brewed</h3>
      ${paramGrid(b)}
      ${b.pours ? html`<div class="pours"><span>Pours</span><pre>${b.pours}</pre></div>` : ''}
    </section>

    ${prev ? html`
      <section class="card">
        <div class="card-title-row">
          <h3 class="card-title">Versus previous brew</h3>
          <a class="small-link" href="#/brew/${prev.id}">${relDay(prev.brewed_at)} · ${fmtScore(prev.rating)}</a>
        </div>
        ${changes.length ? changeChips(changes) : html`<p class="hint">Same recipe as last time.</p>`}
      </section>` : ''}

    <div class="action-grid">
      <a class="btn btn-primary" href="#/brew/new?from=${b.id}">${icon('repeat')} Brew again</a>
      <a class="btn btn-ghost" href="#/recipe/new?from=${b.id}">${icon('copy')} Save as recipe</a>
      <button class="btn btn-ghost danger-text" type="button" data-delete>${icon('trash')} Delete brew</button>
    </div>`.s;

  root.querySelector('[data-delete]').addEventListener('click', async () => {
    if (!(await confirmSheet({ title: 'Delete this brew?', text: 'This can’t be undone.' }))) return;
    try {
      await remove('brews', b.id);
      toast('Brew deleted');
      go(c ? `/coffee/${c.id}` : '/brews', { replace: true });
    } catch (e) { toast(e.message || 'Could not delete', 'error'); }
  });
}
