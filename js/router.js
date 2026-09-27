// Minimal hash router with an in-app back stack (standalone iOS web apps have no back button).
const routes = [];
const stack = [];
const scrollPos = new Map();
let replacing = false;
let lastHash = null;

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, handler, opts });
}

export function current() {
  const h = location.hash.slice(1) || '/';
  const [path, q = ''] = h.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(q)) };
}

export function resolve() {
  const { path, query } = current();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    return { handler: r.handler, opts: r.opts, params, query, path };
  }
  return null;
}

// Call on every hashchange; returns 'push' | 'back' | 'replace'.
export function track() {
  const h = location.hash || '#/';
  if (lastHash) scrollPos.set(lastHash, window.scrollY);
  lastHash = h;
  if (replacing) { replacing = false; stack[stack.length - 1] = h; return 'replace'; }
  if (stack.length > 1 && stack[stack.length - 2] === h) { stack.pop(); return 'back'; }
  if (stack[stack.length - 1] !== h) stack.push(h);
  return 'push';
}

export const savedScroll = (h = location.hash || '#/') => scrollPos.get(h) ?? 0;

export function go(path, { replace = false, reset = false } = {}) {
  const h = '#' + path;
  if (reset) stack.length = 0;
  if (h === location.hash) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
  if (replace || reset) { replacing = !reset; location.replace(h); } else location.hash = path;
}

export function back(fallback = '/') {
  if (stack.length > 1) history.back();
  else go(fallback, { replace: true });
}
