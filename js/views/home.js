import { html, longDate, isToday, daysSince, fmtScore } from '../util.js';
import { state, coffeeById, brewsOfCoffee } from '../store.js';
import { icon, brewCard, buildPrevMap, coffeeThumb, paramLine, recipeName } from '../components.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night brew?';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function home(root) {
  const { coffees, brews } = state;
  const active = coffees.filter((c) => c.status !== 'finished');
  const last = brews[0];
  const todays = brews.filter((b) => isToday(b.brewed_at));
  const prevMap = buildPrevMap();

  const onboarding = html`
    <section class="hero">
      <div class="hero-rings" aria-hidden="true"></div>
      <div class="eyebrow">Welcome</div>
      <h2 class="hero-title">Your coffee library starts here</h2>
      <ol class="steps">
        <li><b>Add the coffee</b> you’re brewing right now.</li>
        <li><b>Save your recipes</b>: dose, grind, temperature, pours.</li>
        <li><b>Log each cup</b> and see which tweaks make it better.</li>
      </ol>
      <div class="hero-actions">
        <a class="btn btn-accent" href="#/coffee/new">${icon('bean')} Add a coffee</a>
        <a class="btn btn-cream" href="#/recipe/new">${icon('cone')} Add a recipe</a>
      </div>
    </section>`;

  const lastCoffee = last && coffeeById(last.coffee_id);
  const hero = html`
    <section class="hero">
      <div class="hero-rings" aria-hidden="true"></div>
      <div class="eyebrow">${todays.length ? 'Brewed today' : 'Today’s cup'}</div>
      <h2 class="hero-title">${todays.length
        ? html`${coffeeById(todays[0].coffee_id)?.name || 'Your cup'} scored <span class="hero-score">${fmtScore(todays[0].rating)}</span>`
        : 'Ready for your morning V60?'}</h2>
      ${last && !todays.length ? html`
        <div class="hero-last">
          <div class="hero-last-label">Last brew · ${lastCoffee?.name || ''} · ${recipeName(last.recipe_id)}</div>
          ${paramLine(last)}
        </div>` : ''}
      ${last?.next_time ? html`<div class="hero-note">${icon('note')}<div><span>Your note for next time</span>“${last.next_time}”</div></div>` : ''}
      <div class="hero-actions">
        <a class="btn btn-accent btn-grow" href="#/brew/new">${icon('plus')} ${todays.length ? 'Log another brew' : 'Log today’s brew'}</a>
      </div>
    </section>`;

  root.innerHTML = html`
    <header class="home-head">
      <div>
        <div class="eyebrow">${longDate(new Date())}</div>
        <h1 class="display">${greeting()}</h1>
      </div>
      <a class="icon-btn" href="#/settings" aria-label="Settings">${icon('sliders')}</a>
    </header>

    ${state.mode === 'local' ? html`<a class="demo-banner" href="#/settings"><b>Demo mode</b> · data stays on this device. Tap to connect the cloud.</a>` : ''}

    ${coffees.length ? hero : onboarding}

    ${brews.length ? html`
      <section class="section">
        <div class="section-head"><h2>Recent brews</h2><a href="#/brews">See all</a></div>
        <div class="stack">${brews.slice(0, 5).map((b) => brewCard(b, { prev: prevMap.get(b.id) }))}</div>
      </section>` : ''}

    ${active.length ? html`
      <section class="section">
        <div class="section-head"><h2>On the shelf</h2><a href="#/coffees">All coffees</a></div>
        <div class="shelf">${active.map((c) => {
          const n = brewsOfCoffee(c.id);
          const best = Math.max(...n.map((b) => b.rating ?? 0), 0);
          const days = daysSince(c.roast_date);
          return html`
            <a class="shelf-card" href="#/coffee/${c.id}">
              ${coffeeThumb(c, 'lg')}
              <div class="shelf-roaster">${c.roaster || ' '}</div>
              <div class="shelf-name">${c.name}</div>
              <div class="shelf-meta">${days != null ? html`<span>Day ${days}</span>` : ''}${n.length ? html`<span>${n.length} brew${n.length > 1 ? 's' : ''}</span>` : html`<span>Not brewed yet</span>`}${best ? html`<span class="best">★ ${fmtScore(best)}</span>` : ''}</div>
            </a>`;
        })}</div>
      </section>` : ''}
  `.s;
}
