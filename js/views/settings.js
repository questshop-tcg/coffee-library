import { html, fmtDuration, shortDate, clock } from '../util.js';
import {
  state, remove, exportData, importData, localDemoData, clearLocalDemoData, signOut, coffeeById, recipeById,
} from '../store.js';
import { icon, pageHead, confirmSheet, toast } from '../components.js';
import { TAG_GROUPS } from '../tags.js';

export function settings(root) {
  const demo = state.mode === 'cloud' ? localDemoData() : null;
  const groupLabel = (id) => TAG_GROUPS.find((g) => g.id === id)?.label || id;

  root.innerHTML = html`
    ${pageHead({ title: 'Settings', back: '/' })}

    <section class="card">
      <h3 class="card-title">Account</h3>
      ${state.mode === 'cloud' ? html`
        <p class="prose">Signed in as <b>${state.user?.email}</b>. Your library syncs to the cloud.</p>
        <button class="btn btn-ghost" type="button" data-signout>Sign out</button>` : html`
        <p class="prose"><b>Demo mode.</b> Everything is stored in this browser only. To sync across devices and keep it safe,
        connect Supabase: follow “Cloud setup” in <code>README.md</code>, then paste your project URL and key into <code>js/config.js</code>.</p>
        <p class="hint">Your demo entries can be copied into your account afterwards.</p>`}
    </section>

    ${demo ? html`
      <section class="card highlight">
        <h3 class="card-title">Demo data on this device</h3>
        <p class="prose">${demo.coffees?.length || 0} coffees, ${demo.recipes?.length || 0} recipes and ${demo.brews?.length || 0} brews from demo mode are still stored here.</p>
        <div class="row-actions">
          <button class="btn btn-primary" type="button" data-import-demo>${icon('upload')} Copy to my account</button>
          <button class="btn btn-ghost" type="button" data-discard-demo>Discard</button>
        </div>
      </section>` : ''}

    <section class="card">
      <h3 class="card-title">Your keywords</h3>
      ${state.tags.length ? html`<div class="tags">${state.tags.map((t) => html`
        <span class="tag removable" data-cat="${t.category}" title="${groupLabel(t.category)}">${t.label}<button type="button" data-del-tag="${t.id}" aria-label="Remove ${t.label}">×</button></span>`)}</div>
        <p class="hint">Removing a keyword keeps it on brews that already use it.</p>`
        : html`<p class="hint">Keywords you add while logging a brew show up here.</p>`}
    </section>

    <section class="card">
      <h3 class="card-title">Backup</h3>
      <p class="hint">Download everything as a file, or restore from one.</p>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" data-export-json>${icon('download')} Backup (JSON)</button>
        <button class="btn btn-ghost" type="button" data-export-csv>${icon('download')} Brews (CSV)</button>
        <label class="btn btn-ghost">${icon('upload')} Restore<input type="file" accept="application/json,.json" hidden data-import></label>
      </div>
    </section>

    ${state.mode === 'local' && (state.coffees.length || state.brews.length) ? html`
      <section class="card">
        <h3 class="card-title">Reset</h3>
        <button class="btn btn-ghost danger-text" type="button" data-erase>${icon('trash')} Erase all demo data</button>
      </section>` : ''}

    <p class="hint center footer-note">Coffee Library · ${state.mode === 'cloud' ? 'Cloud' : 'Demo'} mode</p>`.s;

  const on = (sel, fn) => root.querySelector(sel)?.addEventListener('click', fn);

  on('[data-signout]', async () => {
    if (!(await confirmSheet({ title: 'Sign out?', confirm: 'Sign out', danger: false }))) return;
    await signOut();
    location.reload();
  });

  on('[data-import-demo]', async (e) => {
    e.target.disabled = true;
    try {
      const counts = await importData(demo);
      clearLocalDemoData();
      toast(`Copied ${counts.brews || 0} brews and ${counts.coffees || 0} coffees`);
      settings(root);
    } catch (err) { e.target.disabled = false; toast(err.message || 'Import failed', 'error'); }
  });
  on('[data-discard-demo]', async () => {
    if (!(await confirmSheet({ title: 'Discard demo data?', text: 'The demo entries on this device will be erased.' }))) return;
    clearLocalDemoData();
    settings(root);
  });

  root.querySelectorAll('[data-del-tag]').forEach((b) => b.addEventListener('click', async () => {
    try { await remove('tags', b.dataset.delTag); settings(root); } catch (err) { toast(err.message, 'error'); }
  }));

  on('[data-export-json]', () => download(`coffee-library-${stamp()}.json`, JSON.stringify(exportData(), null, 2), 'application/json'));
  on('[data-export-csv]', () => download(`coffee-brews-${stamp()}.csv`, brewsCSV(), 'text/csv'));

  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.brews) || !Array.isArray(data.coffees)) throw new Error('That file isn’t a Coffee Library backup');
      const ok = await confirmSheet({
        title: 'Restore this backup?',
        text: `${data.coffees.length} coffees, ${data.recipes?.length || 0} recipes, ${data.brews.length} brews. Entries with the same ID are overwritten; nothing else is deleted.`,
        confirm: 'Restore', danger: false,
      });
      if (!ok) return;
      await importData(data);
      toast('Backup restored');
      settings(root);
    } catch (err) { toast(err.message || 'Could not read that file', 'error'); }
    e.target.value = '';
  });

  on('[data-erase]', async () => {
    if (!(await confirmSheet({ title: 'Erase all demo data?', text: 'All coffees, recipes and brews on this device will be deleted.', confirm: 'Erase' }))) return;
    clearLocalDemoData();
    location.hash = '#/';
    location.reload();
  });
}

const stamp = () => new Date().toISOString().slice(0, 10);

async function download(name, content, type) {
  const file = new File([content], name, { type });
  // In the iPhone home-screen app the share sheet is the most reliable way to save a file.
  if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad/.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function brewsCSV() {
  const cols = ['date', 'time', 'coffee', 'roaster', 'origin', 'process', 'recipe', 'dose_g', 'water_g', 'ratio', 'grinder', 'grind_setting', 'temp_c',
    'bloom_water_g', 'bloom_time_s', 'total_time', 'filter', 'water', 'rating', 'keywords', 'notes', 'next_time', 'pours'];
  const cell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = state.brews.map((b) => {
    const c = coffeeById(b.coffee_id);
    const r = recipeById(b.recipe_id);
    return [shortDate(b.brewed_at), clock(b.brewed_at), c?.name, c?.roaster, c?.country, c?.process, r?.name, b.dose_g, b.water_g,
      b.dose_g && b.water_g ? (b.water_g / b.dose_g).toFixed(1) : '', b.grinder, b.grind_setting, b.temp_c, b.bloom_water_g, b.bloom_time_s,
      fmtDuration(b.total_time_s), b.filter, b.water, b.rating, (b.tags || []).join(', '), b.notes, b.next_time, b.pours].map(cell).join(',');
  });
  return [cols.join(','), ...rows].join('\n');
}
