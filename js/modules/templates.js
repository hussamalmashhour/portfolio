import { q } from './core.js';

// Template helpers
export function $tpl(id) {
  const t = q(`#${id}`);
  return (t && t.content && t.content.firstElementChild) ? t.content.firstElementChild : null;
}

export function clone(id) {
  const base = $tpl(id);
  return base ? base.cloneNode(true) : null;
}

export function set(el, key, text) {
  const n = el?.querySelector(`[data-t="${key}"]`);
  if (!n) return;
  n.hidden = text == null || text === '';
  n.textContent = text || '';
}

export function setHTML(el, key, html) {
  const n = el?.querySelector(`[data-t="${key}"]`);
  if (!n) return;
  n.hidden = !html;
  n.innerHTML = html || '';
}