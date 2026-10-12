/* GAID on a phone: look and listen.

   The work fills the screen. One tap starts the voice (a browser plays no
   sound before one). After that the visitor talks, or presses one of four
   pictures: look closer, language, where next, take home. Nothing to read —
   captions only when asked for. Every answer comes through GAID's MCP
   server (/api/mcp), the way Alexa+ would ask; /api/ask is the fallback.

   docs/product.md says why each of these exists. */
import { galleryOf } from './config.js';
import { CHANNEL } from './scene.js';
import { W } from './words.js';
import { callTool } from './mcp-client.js';
import { openRelay, newCode, topicFor, CODE } from './relay.js';
import { visitWords } from './visit.js';
import { listen, say, hush, canListen, canSpeak } from './voice.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = galleryOf(params);
const LANGS = ['English', 'Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French'];

const state = {
  langs: ['English'], translate: false,
  gallery: null, work: null, lang: 'English', seen: [], cc: false, busy: 0,
  stop: null, started: false, lastSay: '',
};

/* ---------------------------------------------------------------- the screen beside the work
   Words reach it only sealed by GAID's server (lib/seal.js); everything else
   is a reference the TV draws from its own copy of the gallery. */
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
let room = CODE.test((params.get('room') || '').toUpperCase()) ? params.get('room').toUpperCase() : null;
let relay = null;
let lastSent = null;
function tellScreen(msg) {
  const m = { ...msg, slug };
  if (m.type === 'answer' || m.type === 'at') lastSent = m;
  channel?.postMessage(m);
  relay?.send(m);
}
channel && (channel.onmessage = (e) => { if (e.data?.type === 'hello' && e.data.slug === slug && lastSent) channel.postMessage(lastSent); });
function pairWith(code) {
  if (!CODE.test(code) || code === room) return;
  relay?.close();
  room = code;
  relay = openRelay({ topic: topicFor(slug, room), onMessage: (m) => { if (m?.type === 'hello' && lastSent) relay.send(lastSent); } });
  $('room').value = room;
  $('paired').hidden = false;
  if (state.work) remember(state.work);
  if (lastSent) relay.send(lastSent);
}

/* ---------------------------------------------------------------- what is on screen */
function remember(work) {
  const at = new URLSearchParams({ gallery: slug, at: work.id });
  if (room) at.set('room', room);
  history.replaceState(null, '', `?${at}`);
}

function show(work) {
  state.work = work;
  if (state.seen.at(-1) !== work.id) state.seen = [...state.seen.filter((id) => id !== work.id), work.id];
  const art = $('art');
  art.src = work.image || '/brand/gaid-mark.svg';
  art.alt = `${work.title}${work.artist ? ', ' + work.artist : ''}`;
  $('h1').textContent = work.title;              // for a screen reader; nothing on screen
  zoom(null);
  for (const b of document.querySelectorAll('#works button')) b.setAttribute('aria-current', String(b.dataset.id === work.id));
  remember(work);
}

// Look closer: move the picture so the box { x, y, w, h } (fractions) fills it.
function zoom(box) {
  const s = $('art').style;
  if (!box || box.w >= 0.99) { s.setProperty('--z', 1); s.setProperty('--tx', '0%'); s.setProperty('--ty', '0%'); return; }
  const z = Math.min(3, 1 / Math.max(box.w, box.h));
  s.setProperty('--z', z.toFixed(3));
  s.setProperty('--tx', `${((0.5 - (box.x + box.w / 2)) * 100).toFixed(1)}%`);
  s.setProperty('--ty', `${((0.5 - (box.y + box.h / 2)) * 100).toFixed(1)}%`);
}

function caption(text) {
  state.lastSay = text ?? '';
  $('cap').textContent = state.lastSay;
  $('cap').hidden = !(state.cc && state.lastSay);
}

function setVoice(s) {
  const t = $('talk');
  t.dataset.state = s;
  t.setAttribute('aria-pressed', String(s === 'listening'));
  t.setAttribute('aria-label', s === 'idle' ? W.talk : W[s] ?? W.talk);
  // Eyes up: while GAID speaks, the phone fades so the visitor looks at the work itself.
  document.querySelector('.v').dataset.voice = s;
}

/* ---------------------------------------------------------------- speaking */
// A curator's own recording beats any voice; then the phone's voice in the
// visitor's language; with none for that language, the original in English.
async function speak(text, { lang = state.lang, original, recording } = {}) {
  caption(text);
  if (recording?.src) {
    const clip = $('clip');
    clip.src = recording.src;
    setVoice('speaking');
    const ended = new Promise((ok) => { clip.onended = clip.onpause = clip.onerror = ok; });
    try { await clip.play(); await ended; setVoice('idle'); return; } catch { /* fall through to a voice */ }
  }
  if (canSpeak(lang)) return say(text, { lang, onState: setVoice });
  return say(`${W.say.noVoice(lang)} ${original ?? text}`, { lang: 'English', onState: setVoice });
}

function stopAll() {
  state.busy += 1;                 // cancels a Look closer in progress
  state.stop?.(); state.stop = null;
  hush();
  const clip = $('clip'); clip.pause();
  setVoice('idle');
  delete document.querySelector('.v').dataset.look;
  // Whatever was zoomed into, a new action starts from the whole work — here and on the TV.
  if ($('art').style.getPropertyValue('--z') > 1) { zoom(null); if (state.work) tellScreen({ type: 'look', workId: state.work.id, box: null }); }
}

/* ---------------------------------------------------------------- asking */
async function ask(question, { quiet = false } = {}) {
  const q = String(question || '').trim();
  if (!q || !state.gallery) return null;
  stopAll();
  setVoice('thinking');
  let out = await callTool('ask_work', { gallery: slug, work_id: state.work?.id, question: q, language: state.lang });
  if (!out || out.found === false) {
    try {
      const res = await fetch('/api/ask', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, workId: state.work?.id, question: q, lang: state.lang }),
      });
      out = await res.json();
      if (out?.ok !== true) out = null;
    } catch { out = null; }
  }
  if (!out || typeof out.say !== 'string') { setVoice('idle'); await speak(W.say.offline, { lang: 'English' }); return null; }
  const a = out.action;
  if (a?.type === 'goto') { const w = state.gallery.works.find((x) => x.id === a.id); if (w) show(w); }
  if (a?.type === 'lang' && state.langs.includes(a.lang)) setLang(a.lang, { quiet: true });
  if (out.seal) tellScreen({ type: 'answer', seal: out.seal });
  if (a?.type === 'stop') { setVoice('idle'); return out; }
  if (!quiet) {
    const playable = a?.type === 'play' || a?.type === 'goto' || a?.type === 'lang';
    await speak(out.say, { lang: out.lang ?? state.lang, original: out.original, recording: playable ? state.work?.audio?.[state.lang] : null });
  }
  return out;
}

const tellMe = () => ask(W.chips[0][1]);   // "Tell me about the work in front of me"

/* ---------------------------------------------------------------- look closer */
async function lookCloser() {
  if (!state.work) return;
  stopAll();
  const run = state.busy;
  document.querySelector('.v').dataset.look = 'on';   // the phone is the picture here: no fading
  // Move on the tap, before the server answers: a button that does nothing
  // for a second reads as a button that does nothing.
  zoom({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
  setVoice('thinking');
  const out = await callTool('look_closer', { gallery: slug, work_id: state.work.id, language: state.lang });
  if (!out?.steps?.length) { zoom(null); delete document.querySelector('.v').dataset.look; setVoice('idle'); return; }
  for (const step of out.steps) {
    if (state.busy !== run) return;              // the visitor did something else
    zoom(step.box);
    tellScreen({ type: 'look', workId: state.work.id, box: step.box });
    // At least as long as the sentence takes to say, even where the voice
    // fails or ends early: the picture moves at the pace of the words.
    const words = step.say.split(/\s+/).length;
    await Promise.all([speak(step.say, { lang: state.gallery.languages[0] }), new Promise((ok) => setTimeout(ok, Math.max(2600, words * 380)))]);
  }
  if (state.busy !== run) return;
  zoom(null);
  delete document.querySelector('.v').dataset.look;
  tellScreen({ type: 'look', workId: state.work.id, box: null });
}

/* ---------------------------------------------------------------- where next */
let nextUp = null;
async function whereNext() {
  if (!state.work) return;
  stopAll();
  setVoice('thinking');
  const out = await callTool('where_next', { gallery: slug, work_id: state.work.id, seen: state.seen });
  if (!out?.next) { setVoice('idle'); if (out?.say) await speak(out.say); return; }
  nextUp = state.gallery.works.find((w) => w.id === out.next.id) ?? null;
  $('nextArt').src = out.next.image || '/brand/gaid-mark.svg';
  $('goNext').setAttribute('aria-label', W.goTo(out.next.title));
  openSheet('nextSheet');
  tellScreen({ type: 'next', workId: state.work.id, nextId: out.next.id });
  await speak(out.say);
}

/* ---------------------------------------------------------------- take home */
function homeWords() { return visitWords(state.gallery.works, state.seen); }
async function takeHome() {
  stopAll();
  const words = homeWords();
  const box = $('homeWorks'); box.textContent = '';
  // Each picture with its word under it: the word is the thing to remember.
  const ids = state.seen.slice(-3);
  words.forEach((word, i) => {
    const w = state.gallery.works.find((x) => x.id === ids[i]);
    const s = document.createElement('figure');
    const img = document.createElement('img'); img.src = w?.image || '/brand/gaid-mark.svg'; img.alt = w?.title ?? '';
    const b = document.createElement('figcaption'); b.textContent = word;
    s.append(img, b); box.append(s);
  });
  $('sayHome').textContent = W.sayAtHome(words.join(', '));
  state.homeLink = `${location.origin}/home?${new URLSearchParams({ gallery: slug, words: words.join(', ') })}`;
  openSheet('homeSheet');
  await speak(W.say.home(words.join(', ')), { lang: 'English' });
}

/* ---------------------------------------------------------------- language */
/* Only languages that will really play: the ones the gallery wrote itself,
   and, when Amazon Nova can translate, the others this phone has a voice
   for. One language is not a choice, so then the button is not there. */
function offered() {
  const own = state.gallery?.languages ?? ['English'];
  const more = state.translate ? LANGS.filter((l) => !own.includes(l) && canSpeak(l)) : [];
  return [...own, ...more];
}
function refreshLangs() {
  state.langs = offered();
  $('lang').hidden = state.langs.length < 2;
  if (!state.langs.includes(state.lang)) state.lang = state.langs[0];
  setLang(state.lang, { quiet: true });
}
function setLang(lang, { quiet = false } = {}) {
  state.lang = lang;
  const dots = $('langDots'); dots.textContent = '';
  for (const l of state.langs) { const i = document.createElement('i'); if (l === lang) i.className = 'on'; dots.append(i); }
  $('lang').setAttribute('aria-label', `${W.language}: ${lang}`);
  if (!quiet) speak(lang, { lang: 'English' });
}

/* ---------------------------------------------------------------- sheets */
function openSheet(id) {
  for (const s of document.querySelectorAll('.v-sheet')) s.hidden = s.id !== id;
  if (id === 'pairSheet') { $('pair').setAttribute('aria-expanded', 'true'); $('room').focus(); speak(W.say.pairHow, { lang: 'English' }); }
}
function closeSheet(id) { $(id).hidden = true; if (id === 'pairSheet') $('pair').setAttribute('aria-expanded', 'false'); }

/* ---------------------------------------------------------------- start */
function strip() {
  const box = $('works'); box.textContent = '';
  for (const w of state.gallery.works) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = w.id; b.setAttribute('aria-label', W.goTo(w.title));
    const i = document.createElement('img'); i.src = w.image || '/brand/gaid-mark.svg'; i.alt = ''; i.loading = 'lazy';
    b.append(i);
    b.addEventListener('click', () => { stopAll(); show(w); tellScreen({ type: 'at', workId: w.id }); if (state.started) tellMe(); });
    box.append(b);
  }
}

function labels() {
  for (const el of document.querySelectorAll('[data-aria]')) {
    const v = W[el.dataset.aria];
    if (typeof v === 'string') el.setAttribute('aria-label', v);
  }
  $('works').setAttribute('aria-label', W.works);
  $('room').setAttribute('aria-label', W.screen);
}

async function begin() {
  if (state.started) return;
  state.started = true;
  $('start').hidden = true;
  if (!state.gallery) { await speak(state.why === 'not-on' ? W.closedSay(state.name) : W.say.offline, { lang: 'English' }); return; }
  let first = true;
  try { first = !localStorage.getItem('gaid.first'); localStorage.setItem('gaid.first', '1'); } catch { /* private window */ }
  if (first) await speak(W.say.first, { lang: 'English' });
  if (room) await speak(W.say.paired, { lang: 'English' });
  await tellMe();
}

async function start() {
  labels();
  refreshLangs();
  setVoice('idle');
  let data = null;
  try { data = await (await fetch(`/api/gallery?slug=${encodeURIComponent(slug)}`)).json(); } catch { data = null; }
  if (data?.ok && data.gallery) {
    state.gallery = data.gallery;
    state.translate = data.translate === true;
    state.lang = data.gallery.languages[0] ?? 'English';
    refreshLangs();
    globalThis.speechSynthesis?.addEventListener?.('voiceschanged', refreshLangs);
    strip();
    show(data.gallery.works.find((w) => w.id === params.get('at')) ?? data.gallery.works[0]);
    if (state.work) tellScreen({ type: 'at', workId: state.work.id });
  } else {
    state.why = data?.why; state.name = data?.name;
    $('art').src = '/brand/gaid-mark.svg'; $('art').alt = state.why === 'not-on' ? W.notOn : W.notFound;
  }
  if (room) { const r = room; room = null; pairWith(r); }

  $('start').addEventListener('click', begin);
  $('talk').addEventListener('click', () => {
    if (!state.started) return begin();
    if ($('talk').dataset.state !== 'idle') return stopAll();
    if (!canListen) return tellMe();
    state.stop = listen({ lang: state.lang, onText: (t) => ask(t), onState: (s) => { setVoice(s); if (s === 'idle') state.stop = null; } });
  });
  $('look').addEventListener('click', () => { state.started = true; $('start').hidden = true; lookCloser(); });
  $('next').addEventListener('click', () => { state.started = true; $('start').hidden = true; whereNext(); });
  $('home').addEventListener('click', () => { state.started = true; $('start').hidden = true; takeHome(); });
  $('hearAgain').addEventListener('click', () => speak(W.say.home(homeWords().join(', ')), { lang: 'English' }));
  // Save: the phone's own share sheet (messages, notes, email), else the link copied.
  $('share').addEventListener('click', async () => {
    const url = state.homeLink;
    if (!url) return;
    try { if (navigator.share) { await navigator.share({ title: W.name, text: homeWords().join(', '), url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); speak(W.say.saved, { lang: 'English' }); } catch { location.href = url; }
  });
  $('lang').addEventListener('click', () => setLang(state.langs[(state.langs.indexOf(state.lang) + 1) % state.langs.length]));
  $('goNext').addEventListener('click', () => { closeSheet('nextSheet'); if (nextUp) { show(nextUp); tellScreen({ type: 'at', workId: nextUp.id }); tellMe(); } });
  $('cc').addEventListener('click', () => { state.cc = !state.cc; $('cc').setAttribute('aria-pressed', String(state.cc)); caption(state.lastSay); });
  $('pair').addEventListener('click', () => ($('pairSheet').hidden ? openSheet('pairSheet') : closeSheet('pairSheet')));
  $('room').addEventListener('input', (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.value = v;
    if (v.length === 4) { pairWith(v); closeSheet('pairSheet'); speak(W.say.paired, { lang: 'English' }); }
  });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => closeSheet(b.dataset.close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { stopAll(); for (const s of document.querySelectorAll('.v-sheet')) closeSheet(s.id); } });
}

start();
