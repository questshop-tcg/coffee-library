// ---------- HTML templating (auto-escaping) ----------
export class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(s ?? '');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function val(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += val(vals[i]) + strings[i + 1];
  return new Raw(out);
}

// ---------- ids ----------
export function uuid() {
  if (crypto.randomUUID) { try { return crypto.randomUUID(); } catch { /* insecure context */ } }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- parsing ----------
export const str = (v) => (v ?? '').toString().trim() || null;

// Accepts "15", "15.5" and "15,5" (German keyboards).
export function num(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export const int = (v) => { const n = num(v); return n == null ? null : Math.round(n); };

// "3:05", "3.05", "3,05" -> 185 s; "185" -> 185 s; small numbers are minutes ("3" -> 180 s).
export function parseDuration(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d+)\s*[:.,']\s*(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = num(s);
  if (n == null) return null;
  return n <= 15 ? Math.round(n * 60) : Math.round(n);
}

// ---------- formatting ----------
export const fmtNum = (n, d = 1) => (n == null ? '' : String(Number(Number(n).toFixed(d))));
export const fmtScore = (r) => (r == null ? '–' : Number(r).toFixed(1));
export const fmtDuration = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
export const ratio = (dose, water) => (dose && water ? water / dose : null);
export const fmtRatio = (r) => (r == null ? '' : `1:${fmtNum(r, 1)}`);

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const time = (iso) => new Date(iso).getTime();

export function relDay(iso) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return shortDate(iso);
}
export function shortDate(iso) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}
export const longDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export const monthLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const isToday = (iso) => startOfDay(new Date(iso)) === startOfDay(new Date());

// "2026-09-10" (a plain date) -> whole days until today
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round((startOfDay(new Date()) - new Date(y, m - 1, d).getTime()) / 86400000);
}

export function toLocalInput(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ratingWord(r) {
  if (r == null) return 'Not rated';
  if (r >= 9.5) return 'Unforgettable';
  if (r >= 9) return 'Outstanding';
  if (r >= 8) return 'Excellent';
  if (r >= 7) return 'Very good';
  if (r >= 6) return 'Good';
  if (r >= 5) return 'Decent';
  if (r >= 4) return 'Meh';
  if (r >= 3) return 'Poor';
  return 'Undrinkable';
}

export const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Downscale a picked photo to a JPEG blob.
export async function resizeImage(file, max = 1400, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToDataURL = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(blob);
});
