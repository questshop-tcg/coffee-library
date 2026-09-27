# Coffee Library

A personal web app (PWA) for logging specialty coffees, V60 recipes and how each cup turned out.
It installs on the iPhone home screen and runs full-screen like a native app.

- **Coffees**: roaster, origin, farm, variety, process, roast level and date, bag notes, photo, price.
- **Recipes**: your named recipes (dose, water, grind, temperature, bloom, pours, target time).
- **Brews**: each cup starts from a recipe or your last brew of that coffee. You log what you changed,
  a score (1–10 in half steps), flavor keywords and notes.
- **Recipe → result**: each brew shows what changed since the previous brew of that coffee and how
  the score moved. The *Compare* table on a coffee or recipe highlights every changed parameter.

No build step: plain HTML, CSS and JavaScript modules. Data lives in Supabase (cloud), or in the
browser in demo mode.

## Run locally

```bash
node dev-server.mjs
```

Open http://localhost:8080. Without Supabase configured, the app runs in **demo mode** and stores
data in this browser only.

## Cloud setup (Supabase)

1. Create a free account and a new project at https://supabase.com (any region close to you).
2. **Database**: in the dashboard open *SQL Editor* → *New query*, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and click *Run*.
3. **Auth**: *Authentication → Sign In / Providers → Email* should be enabled (it is by default).
   Optional: turn off *Confirm email* so you can sign in right after creating your account.
   Otherwise, set *Authentication → URL Configuration → Site URL* to your GitHub Pages URL so the
   confirmation link opens the app.
4. **Keys**: *Project Settings → API Keys* (or the *Connect* button). Copy the **Project URL** and
   the **publishable / anon** key into [`js/config.js`](js/config.js). Never use the `service_role`
   or secret key here.
5. Reload the app, create your account and sign in. If you tried demo mode first, *Settings* offers
   to copy those demo entries into your account.

Both values in `config.js` are meant to be public; row-level security makes sure only you can read
and change your data.

> Supabase pauses free projects after about a week without any requests. Using the app daily keeps
> it awake; if it does pause, restore it from the dashboard with one click.

## Deploy (GitHub Pages)

1. Create a new repository on GitHub (for example `coffee-library`) and push this folder to it.
2. In the repository: *Settings → Pages → Build and deployment → Deploy from a branch*,
   pick `main` and `/ (root)`, save.
3. After a minute the app is live at `https://<your-username>.github.io/coffee-library/`.

## Install on the iPhone

Open the GitHub Pages URL in **Safari** → Share button → **Add to Home Screen**.
The home-screen app has its own storage, separate from Safari, so sign in inside the installed app.

## Updating

Push changes to GitHub. The installed app picks them up the next time it's opened online. If
something looks stale, close the app fully and reopen it. When changing the list of files, bump
`VERSION` in `sw.js`.

## Project layout

```
index.html              app shell, tab bar
css/styles.css          all styling
js/app.js               boot, routes, rendering
js/store.js             data layer (Supabase or local demo storage)
js/components.js        shared UI: brew cards, compare table, rating input, keyword picker
js/tags.js              built-in flavor keywords, origins, processes…
js/views/*.js           one module per screen
sw.js                   offline cache
supabase/schema.sql     database tables, security rules, photo storage
tools/make-icons.mjs    regenerates the PNG app icons
```
