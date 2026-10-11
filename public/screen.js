/* The screen beside the work. It never listens and never speaks: the phone
   (index.html) does both, and tells this page what was asked through a
   BroadcastChannel. Opened on its own it still shows the work, so a screen
   switched on before anybody has asked anything is never blank.

   Every word on it is built with textContent: a gallery's file is somebody
   else's writing, and none of it is ever parsed as markup. */
import { CHANNEL, panelFor } from '/scene.js';
import { W } from '/words.js';
import { openRelay, newCode, topicFor, CODE } from '/relay.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = (params.get('gallery') || 'sample').toLowerCase();
const state = { gallery: null, work: null };

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function thumb(work, current = false) {
  const card = el('figure', current ? 'card here' : 'card');
  const box = el('div', 'thumb');
  if (work.image) { const i = el('img'); i.src = work.image; i.alt = ''; box.append(i); }
  card.append(box, el('figcaption', '', work.title));
  return card;
}

/* -------------------------------------------------------------- panels */
const draw = {
  // The story itself, large, where a panel would otherwise be empty.
  about(p, say) { return say ? el('p', 'p-story', say) : null; },

  artist(p) {
    const box = el('div', 'p-artist');
    box.append(el('h2', 'p-head', p.name));
    if (p.bio) box.append(el('p', 'p-text', p.bio));
    if (p.works.length) {
      box.append(el('p', 'p-label', W.moreBy(p.name)));
      const row = el('div', 'row');
      for (const w of p.works.slice(0, 4)) row.append(thumb(w));
      box.append(row);
    }
    return box;
  },

  timeline(p) {
    const box = el('div', 'p-time');
    box.append(el('p', 'p-label', `${p.first}–${p.last}`));
    const row = el('ol', 'line');
    for (const w of p.works) {
      const li = el('li', w.id === state.work.id ? 'here' : '');
      li.append(el('span', 'yr', w.year), thumb(w, w.id === state.work.id));
      row.append(li);
    }
    box.append(row);
    return box;
  },

  medium(p) {
    const box = el('div', 'p-medium');
    box.append(el('h2', 'p-head', p.name));
    if (p.note) box.append(el('p', 'p-text', p.note));
    if (p.works.length) {
      box.append(el('p', 'p-label', W.moreIn(p.name)));
      const row = el('div', 'row');
      for (const w of p.works.slice(0, 4)) row.append(thumb(w));
      box.append(row);
    }
    return box;
  },

  // The work drawn to scale beside a person 170 cm tall, standing on one floor line.
  scale(p) {
    const NS = 'http://www.w3.org/2000/svg';
    const PERSON = 170;
    const h = p.size.h;
    // Only a height given ("164 cm high"): the work's own picture decides the width.
    const art = $('art');
    const ratio = art.naturalWidth && art.naturalHeight ? art.naturalWidth / art.naturalHeight : 0.45;
    const w = p.size.w ?? h * ratio;
    const gap = 30;
    const H = Math.max(PERSON, h) * 1.08;
    const width = 60 + gap + w;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `-10 ${-H} ${width + 20} ${H + 26}`);
    svg.setAttribute('class', 'p-scale');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', W.scaleSaid(state.work.title, p.label));
    const add = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg.append(n); return n;
    };
    // the person
    add('circle', { cx: 30, cy: -PERSON + 12, r: 12, class: 'who' });
    add('rect', { x: 12, y: -PERSON + 28, width: 36, height: 70, rx: 14, class: 'who' });
    add('rect', { x: 15, y: -PERSON + 92, width: 13, height: 78, rx: 6, class: 'who' });
    add('rect', { x: 32, y: -PERSON + 92, width: 13, height: 78, rx: 6, class: 'who' });
    // the work: its own picture where there is one, else its outline
    const x = 60 + gap;
    add('rect', { x, y: -h, width: w, height: h, class: state.work.image ? 'work' : 'work bare' });
    if (state.work.image) {
      const img = add('image', { x, y: -h, width: w, height: h, preserveAspectRatio: 'xMidYMax meet' });
      img.setAttribute('href', state.work.image);
    }
    add('line', { x1: -10, y1: 0, x2: width + 10, y2: 0, class: 'floor' });
    const t1 = add('text', { x: 30, y: 18, 'text-anchor': 'middle', class: 'lbl' }); t1.textContent = '1.7 m';
    const t2 = add('text', { x: x + w / 2, y: 18, 'text-anchor': 'middle', class: 'lbl' }); t2.textContent = p.label;

    const box = el('div', 'p-scalebox');
    box.append(svg, el('p', 'p-label', `${W.toScale} · ${W.person}`));
    return box;
  },

  rooms(p) {
    const box = el('div', 'p-rooms');
    const grid = el('div', 'rooms');
    for (const r of p.rooms) {
      const here = r.name === p.here;
      const card = el('section', here ? 'room here' : 'room');
      const head = el('h2', 'room-name', r.name);
      card.append(head);
      card.append(el('p', 'room-floor', [r.floor, here ? W.here : ''].filter(Boolean).join(' · ')));
      const row = el('div', 'row small');
      for (const w of r.works.slice(0, 4)) row.append(thumb(w, w.id === state.work.id));
      card.append(row);
      grid.append(card);
    }
    box.append(grid);
    return box;
  },
};

/* -------------------------------------------------------------- showing */
function showWork(work) {
  state.work = work;
  const g = state.gallery;
  $('title').textContent = work ? work.title : g.name;
  $('meta').textContent = work ? [work.artist, work.year, work.medium].filter(Boolean).join(' · ') : '';
  $('where').textContent = work?.room ? `${g.name} · ${work.room}` : g.name;
  const art = $('art');
  if (work?.image) {
    art.src = work.image; art.alt = `${work.title}${work.artist ? ', ' + work.artist : ''}`; art.hidden = false;
    $('noart').hidden = true;
  } else {
    art.removeAttribute('src'); art.hidden = true; $('noart').hidden = false;
  }
}

function showPanel(topic, say = '') {
  const panel = $('panel');
  const p = panelFor(state.gallery, state.work, topic);
  panel.textContent = '';
  panel.dataset.kind = p.kind;
  const node = draw[p.kind]?.(p, say);
  // The story is in the panel now; saying it again underneath would be twice.
  $('reply').hidden = p.kind === 'about' && Boolean(say);
  if (node) panel.append(node);
  // restart the fade so each answer arrives rather than flickers in
  panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
}

function caption(you, reply) {
  $('you').dataset.q = you ?? '';
  $('you').textContent = you ? `“${you.replace(/^\s*(hey\s+|ok\s+)?alexa[\s,.!:-]*/i, '')}”` : '';
  $('reply').textContent = reply ?? '';
}

function receive(m) {
  if (!m || typeof m !== 'object' || !state.gallery) return;
  if (m.slug && m.slug !== slug) return;            // a different gallery's phone
  if (m.type === 'listening') { $('reply').hidden = false; state.before = [$('you').dataset.q ?? '', $('reply').textContent]; caption('', W.tvListening); return; }
  if (m.type === 'idle') { if (state.before) caption(...state.before); state.before = null; return; }
  if (m.type !== 'answer') return;
  const work = state.gallery.works.find((w) => w.id === m.workId);
  if (work && work !== state.work) showWork(work);
  const say = typeof m.say === 'string' ? m.say : '';
  caption(typeof m.question === 'string' ? m.question : '', say);
  showPanel(typeof m.topic === 'string' ? m.topic : 'about', say);
}

async function start() {
  for (const n of document.querySelectorAll('[data-w]')) { const v = W[n.dataset.w]; if (typeof v === 'string') n.textContent = v; }
  let data = null;
  try { data = await (await fetch(`/api/gallery?slug=${encodeURIComponent(slug)}`)).json(); } catch { data = null; }
  if (!data?.ok || !data.gallery) {
    $('title').textContent = W.notFound;
    return;
  }
  state.gallery = data.gallery;
  showWork(data.gallery.works.find((w) => w.id === params.get('at')) ?? data.gallery.works[0] ?? null);
  showPanel('about');
  caption('', W.tvAsk);

  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => receive(e.data);
    ch.postMessage({ type: 'hello', slug });       // a phone already open answers with where it is
  }
  // A phone on another device: this screen shows a code, the phone types it.
  const asked = (params.get('room') || '').toUpperCase();
  const room = CODE.test(asked) ? asked : newCode();
  const here = new URLSearchParams(location.search); here.set('room', room);
  history.replaceState(null, '', `?${here}`);
  $('code').textContent = `${W.pair} · ${room}`;
  const relay = openRelay({ topic: topicFor(slug, room), onMessage: receive });
  relay.send({ type: 'hello', slug });
}

start();
