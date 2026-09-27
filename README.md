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
3. **Auth**: under *Authentication → Sign In / Providers*, keep *Email* enabled, turn off
   *Confirm email* and turn off *Allow new users to sign up*, so nobody else can create an account.
4. **Your account**: *Authentication → Users → Add user → Create new user*, enter your email and a
   strong password, and tick *Auto Confirm User*. The app has no sign-up screen; it only signs in.
5. **Keys**: *Project Settings → API Keys* (or the *Connect* button). Copy the **Project URL** and
   the **publishable / anon** key into [`js/config.js`](js/config.js). Never use the `service_role`
   or secret key here.
6. Reload the app and sign in. If you tried demo mode first, *Settings* offers to copy those demo
   entries into your account.

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

## Security notes

- Nothing secret is in this repository. The Supabase publishable key is designed to be public; the
  database only accepts requests from your signed-in account (row-level security), and sign-ups are
  disabled. Never commit the `service_role`/secret key or any password.
- Bag photos are in a public bucket under random file names: viewable only by someone who has the
  exact link, and the bucket can't be listed. Photos are re-encoded in the browser before upload,
  which strips EXIF data such as GPS location.

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
