/* About: the icon key and the plain facts, from words.js. The icons are
   the phone's own drawings, so the key cannot drift from the screen. */
import { W } from './words.js';

const ICON = {
  listen: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  talk: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  look: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5M11 8v6M8 11h6"/>',
  lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  next: '<path d="M4 12h14M13 6l6 6-6 6"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cc: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M10 10.2a2.5 2.5 0 1 0 0 3.6M17 10.2a2.5 2.5 0 1 0 0 3.6"/>',
  pair: '<rect x="2" y="4" width="20" height="13" rx="1"/><path d="M8 21h8M12 17v4"/>',
};

for (const n of document.querySelectorAll('[data-w]')) { const v = W[n.dataset.w]; if (typeof v === 'string') n.textContent = v; }
const icons = document.getElementById('icons');
for (const [key, label] of W.aboutIcons) {
  const li = document.createElement('li');
  li.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[key]}</svg>`;
  li.append(label);
  icons.append(li);
}
const facts = document.getElementById('facts');
for (const f of W.aboutFacts) { const li = document.createElement('li'); li.textContent = f; facts.append(li); }
