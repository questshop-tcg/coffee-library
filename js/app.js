import * as store from './store.js';
import { route, resolve, track, go, back, savedScroll } from './router.js';
import { html } from './util.js';
import { toast } from './components.js';
import { home } from './views/home.js';
import { brewList, brewDetail } from './views/brews.js';
import { brewForm } from './views/brewForm.js';
import { coffeeList, coffeeDetail, coffeeForm } from './views/coffees.js';
import { recipeList, recipeDetail, recipeForm } from './views/recipes.js';
import { settings } from './views/settings.js';
import { authView } from './views/auth.js';

const form = { form: true };
route('/', home);
route('/brews', brewList);
route('/brew/new', brewForm, form);
route('/brew/:id/edit', brewForm, form);
route('/brew/:id', brewDetail);
route('/coffees', coffeeList);
route('/coffee/new', coffeeForm, form);
route('/coffee/:id/edit', coffeeForm, form);
route('/coffee/:id', coffeeDetail);
route('/recipes', recipeList);
route('/recipe/new', recipeForm, form);
route('/recipe/:id/edit', recipeForm, form);
route('/recipe/:id', recipeDetail);
route('/settings', settings);

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let ready = false;
let currentIsForm = false;

function tabFor(path) {
  if (path === '/') return 'today';
  if (path === '/brew/new') return 'add';
  if (path.startsWith('/brew')) return 'brews';
  if (path.startsWith('/coffee')) return 'coffees';
  if (path.startsWith('/recipe')) return 'recipes';
  return '';
}

function render(nav = 'push') {
  if (!ready) return;
  const r = resolve();
  if (!r) { go('/', { replace: true }); return; }
  currentIsForm = Boolean(r.opts.form);
  document.body.classList.toggle('is-form', currentIsForm);
  const tab = tabFor(r.path);
  tabbar.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));

  // A fresh container per render, so listeners from the previous view are dropped.
  const keepY = window.scrollY;
  const root = document.createElement('div');
  root.className = 'page';
  view.replaceChildren(root);
  try {
    r.handler(root, r.params, r.query);
  } catch (e) {
    console.error(e);
    root.innerHTML = html`<div class="empty"><h3>Something went wrong</h3><p>${e.message}</p><a class="btn btn-primary" href="#/">Go home</a></div>`.s;
  }
  if (nav === 'refresh') root.classList.add('no-anim');
  window.scrollTo(0, nav === 'refresh' ? keepY : nav === 'back' ? savedScroll() : 0);
}

window.addEventListener('hashchange', () => render(track()));

document.addEventListener('click', (e) => {
  const backBtn = e.target.closest('[data-back]');
  if (backBtn) { e.preventDefault(); back(backBtn.dataset.back); return; }
  // Main tabs replace history instead of stacking it.
  const tab = e.target.closest('#tabbar [data-tab]');
  if (tab && tab.dataset.tab !== 'add') { e.preventDefault(); go(tab.getAttribute('href').slice(1), { reset: true }); return; }
  const row = e.target.closest('tr[data-href]');
  if (row) location.hash = row.dataset.href;
});

// Re-render when data changes in the background, but never under a form being filled in.
store.onChange(() => { if (ready && !currentIsForm) render('refresh'); });

async function boot() {
  try {
    const { needsAuth } = await store.init();
    if (needsAuth) {
      document.body.classList.add('is-auth');
      authView(view, () => { document.body.classList.remove('is-auth'); boot(); });
      return;
    }
    ready = true;
    track();
    render();
    if (store.state.mode === 'cloud') {
      store.refresh().catch((e) => {
        console.warn(e);
        toast(navigator.onLine ? 'Could not load your data' : 'Offline: showing saved data', 'error');
      });
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = html`<div class="empty"><h3>Couldn’t start</h3><p>${navigator.onLine ? e.message : 'You’re offline and the app hasn’t been loaded before.'}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try again</button></div>`.s;
  }
}

boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}
