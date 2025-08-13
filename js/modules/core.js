// DOM Utilities
export const q = (sel, root = document) => root.querySelector(sel);
export const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Content clearing
export function clear(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

// String utilities
export function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// Date formatting
export function monthYear(iso, lang = 'en') {
  if (!iso) return '';
  if (iso === 'Present') return lang === 'es' ? 'Actual' : 'Present';
  const [y, m] = (iso + '').split('-');
  if (!m) return y;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
}