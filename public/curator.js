/* What visitors asked that the gallery's words did not answer, most asked
   first — each one a wall label waiting to be written. Read through GAID's
   MCP server (visitor_questions), the same tool Alexa+ calls. The key is
   typed, sent in the request body, and never put in the address. */
import { galleryOf } from './config.js';
import { W } from './words.js';
import { callTool } from './mcp-client.js';

const $ = (id) => document.getElementById(id);
const slug = galleryOf(new URLSearchParams(location.search));
let images = new Map();

function row(q) {
  const li = document.createElement('li'); li.className = 'q';
  const t = document.createElement('div'); t.className = 'thumb';
  const src = images.get(q.workId);
  if (src) { const i = document.createElement('img'); i.src = src; i.alt = ''; t.append(i); }
  const words = document.createElement('div'); words.className = 'q-words';
  const text = document.createElement('p'); text.className = 'q-text'; text.textContent = `“${q.question}”`;
  const work = document.createElement('p'); work.className = 'q-work'; work.textContent = q.title || '';
  words.append(text, work);
  const n = document.createElement('span'); n.className = 'q-times'; n.textContent = W.times(q.times);
  li.append(t, words, n);
  return li;
}

async function load(key) {
  $('state').textContent = W.thinking;
  const out = await callTool('visitor_questions', key ? { gallery: slug, key } : { gallery: slug });
  const list = $('list'); list.textContent = '';
  if (!out || out.found === false) { $('state').textContent = W.listOffline; return; }
  if (!out.questions.length) { $('state').textContent = W.noQuestions; return; }
  $('state').textContent = '';
  for (const q of out.questions) list.append(row(q));
}

async function start() {
  for (const n of document.querySelectorAll('[data-w]')) { const v = W[n.dataset.w]; if (typeof v === 'string') n.textContent = v; }
  $('key').placeholder = ['sample', 'openaccess'].includes(slug) ? W.keyHint : W.key;
  try {
    const g = (await (await fetch(`/api/gallery?slug=${encodeURIComponent(slug)}`)).json())?.gallery;
    if (g) { $('gallery').textContent = g.name; images = new Map(g.works.map((w) => [w.id, w.image])); }
  } catch { /* the list still loads without pictures */ }
  $('keyForm').addEventListener('submit', (e) => { e.preventDefault(); load($('key').value.trim()); });
  load('');
}

start();
