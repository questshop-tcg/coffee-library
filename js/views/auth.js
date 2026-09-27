import { html } from '../util.js';
import { signIn } from '../store.js';

// Sign-in only: public sign-ups are disabled; the account is created in the Supabase dashboard.
export function authView(root, onDone) {
  const render = (msg = '', kind = '') => {
    root.innerHTML = html`
      <div class="auth">
        <img class="auth-mark" src="icons/icon-192.png" alt="">
        <h1 class="display">Coffee Library</h1>
        <p class="auth-sub">Sign in to your coffee journal.</p>
        <form class="form auth-form" novalidate>
          <label class="field"><span class="label">Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label class="field"><span class="label">Password</span><input type="password" name="password" autocomplete="current-password" required></label>
          ${msg ? html`<p class="auth-msg ${kind}">${msg}</p>` : ''}
          <button class="btn btn-primary btn-block btn-lg" type="submit">Sign in</button>
        </form>
      </div>`.s;

    root.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const email = String(f.get('email')).trim();
      const password = String(f.get('password'));
      if (!email || !password) { render('Enter your email and password.', 'error'); return; }
      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        await signIn(email, password);
        onDone();
      } catch (err) {
        const offline = /fetch|network/i.test(err.message || '');
        render(offline ? 'Can’t reach the server. Check your connection.' : err.message || 'Something went wrong', 'error');
      }
    });
  };
  render();
}
