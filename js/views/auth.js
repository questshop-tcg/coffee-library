import { html } from '../util.js';
import { signIn, signUp } from '../store.js';

export function authView(root, onDone) {
  let mode = 'signin';
  const render = (msg = '', kind = '') => {
    root.innerHTML = html`
      <div class="auth">
        <img class="auth-mark" src="icons/icon-192.png" alt="">
        <h1 class="display">Coffee Library</h1>
        <p class="auth-sub">${mode === 'signin' ? 'Sign in to your coffee journal.' : 'Create your account. You only need to do this once.'}</p>
        <form class="form auth-form" novalidate>
          <label class="field"><span class="label">Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label class="field"><span class="label">Password</span><input type="password" name="password" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" minlength="6" required></label>
          ${msg ? html`<p class="auth-msg ${kind}">${msg}</p>` : ''}
          <button class="btn btn-primary btn-block btn-lg" type="submit">${mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button class="link-btn" type="button" data-toggle>${mode === 'signin' ? 'First time here? Create an account' : 'Already have an account? Sign in'}</button>
      </div>`.s;

    root.querySelector('[data-toggle]').addEventListener('click', () => { mode = mode === 'signin' ? 'signup' : 'signin'; render(); });
    root.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const email = String(f.get('email')).trim();
      const password = String(f.get('password'));
      if (!email || password.length < 6) { render('Enter your email and a password of at least 6 characters.', 'error'); return; }
      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        if (mode === 'signin') {
          await signIn(email, password);
          onDone();
        } else {
          const { needsConfirmation } = await signUp(email, password);
          if (needsConfirmation) { mode = 'signin'; render('Account created. Confirm it via the email we just sent, then sign in here.', 'ok'); }
          else onDone();
        }
      } catch (err) {
        const offline = /fetch|network/i.test(err.message || '');
        render(offline ? 'Can’t reach the server. Check your connection (and the Supabase URL in js/config.js).' : err.message || 'Something went wrong', 'error');
      }
    });
  };
  render();
}
