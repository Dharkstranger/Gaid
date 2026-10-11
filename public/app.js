/* Gaid in the browser: show the work, listen, ask, speak the answer.
   Everything it knows comes from /api/gallery; everything it says comes from
   /api/ask. If the browser cannot listen, the question box does the job; if
   the server cannot answer, it says so plainly and the work stays on screen. */

import { CHANNEL, strong } from '/scene.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = (params.get('gallery') || 'sample').toLowerCase();

const SPEECH = { English: 'en-GB', Yoruba: 'yo-NG', Igbo: 'ig-NG', Hausa: 'ha-NG', French: 'fr-FR',
  Pidgin: 'en-NG', Portuguese: 'pt-PT', Spanish: 'es-ES', Arabic: 'ar', Swahili: 'sw-KE' };

const state = { gallery: null, work: null, lang: 'English', history: [], listening: false };

/* ---------------------------------------------------------------- the screen beside the work */
// The big screen (screen.html) shows what the phone says. It is told through
// a BroadcastChannel, so for now it has to be a window of this same browser.
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
let lastSent = null;
function tellScreen(msg) {
  const m = { ...msg, slug };
  if (m.type === 'answer') lastSent = m;
  channel?.postMessage(m);
}
if (channel) {
  channel.onmessage = (e) => {
    if (e.data?.type === 'hello' && e.data.slug === slug && lastSent) channel.postMessage(lastSent);
  };
}

/* ---------------------------------------------------------------- screen */
function show(work) {
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
  for (const b of document.querySelectorAll('.works button')) {
    b.setAttribute('aria-current', String(b.dataset.id === work?.id));
  }
  if (work) {
    const at = `?gallery=${encodeURIComponent(slug)}&at=${encodeURIComponent(work.id)}`;
    history.replaceState(null, '', at);
    $('toScreen').href = `/screen.html${at}`;
  }
}

function setBar(s) { $('bar').dataset.state = s; }

function caption(you, reply, source) {
  $('you').hidden = !you; $('you').textContent = you ? `You: ${you}` : '';
  $('reply').textContent = reply;
  $('source').hidden = !source;
  $('source').textContent = source === 'nova' ? 'Answered by Amazon Nova, from the gallery’s words.'
    : source === 'gallery' ? 'From the gallery’s own words.' : '';
}

/* ---------------------------------------------------------------- voice */
function stopTalking() {
  speechSynthesis?.cancel();
  const clip = $('clip'); clip.pause();
  setBar('idle');
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) { setBar('idle'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH[state.lang] || 'en-GB';
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.96;
  u.onstart = () => setBar('speaking');
  u.onend = u.onerror = () => setBar('idle');
  speechSynthesis.speak(u);
}

// A recording in the gallery's own voice beats the browser reading it out.
function playOrSpeak(text) {
  const rec = state.work?.audio?.[state.lang];
  if (rec?.src) {
    const clip = $('clip');
    clip.src = rec.src;
    clip.onplay = () => setBar('speaking');
    clip.onended = clip.onpause = () => setBar('idle');
    clip.play().catch(() => speak(text));
    return;
  }
  speak(text);
}

/* ---------------------------------------------------------------- asking */
async function ask(question) {
  const q = String(question || '').trim();
  if (!q || !state.gallery) return;
  stopTalking();
  caption(q, 'Thinking…', '');
  let out = null;
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, workId: state.work?.id, question: q, lang: state.lang, history: state.history }),
    });
    out = await res.json();
  } catch { out = null; }
  if (!out || out.ok !== true || typeof out.say !== 'string') {
    caption(q, 'I could not reach the guide just now. The work is still here; try again in a moment.', '');
    return;
  }
  const a = out.action;
  if (a?.type === 'goto') {
    const w = state.gallery.works.find((x) => x.id === a.id);
    if (w) show(w);
  }
  if (a?.type === 'lang' && state.gallery.languages.includes(a.lang)) {
    state.lang = a.lang; $('lang').value = a.lang;
  }
  state.history = [...state.history, { role: 'user', text: q }, { role: 'assistant', text: out.say }].slice(-8);
  caption(q, out.say, out.source);
  if (a?.type === 'stop') return;
  tellScreen({ type: 'answer', workId: state.work?.id, topic: out.topic ?? 'about', question: q, say: out.say });
  if (a?.type === 'play' || a?.type === 'goto' || a?.type === 'lang') playOrSpeak(out.say);
  else speak(out.say);
}

/* ---------------------------------------------------------------- listening */
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function setupMic() {
  const btn = $('talk');
  if (!Recognition) { btn.hidden = true; return; }
  btn.addEventListener('click', () => {
    if (state.listening) { rec?.stop(); return; }
    stopTalking();
    rec = new Recognition();
    rec.lang = SPEECH[state.lang] || 'en-GB';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => { state.listening = true; btn.setAttribute('aria-pressed', 'true'); $('talkWord').textContent = 'Listening'; setBar('listening'); tellScreen({ type: 'listening' }); };
    rec.onresult = (e) => {
      const said = [...e.results].map((r) => r[0].transcript).join(' ');
      $('q').value = said;
      if (e.results[e.results.length - 1].isFinal) finalText = said;
    };
    rec.onerror = () => {};
    rec.onend = () => {
      state.listening = false; btn.setAttribute('aria-pressed', 'false'); $('talkWord').textContent = 'Talk'; setBar('idle');
      if (finalText) { ask(finalText); $('q').value = ''; } else tellScreen({ type: 'idle' });
    };
    rec.start();
  });
}

/* ---------------------------------------------------------------- start */
function chips() {
  const asks = ['Alexa, tell me about the work in front of me', 'Who made it?', 'When was it made?', 'What else is here?'];
  const other = state.gallery.languages.find((l) => l !== state.gallery.languages[0]);
  if (other) asks.push(`Say it in ${other}`);
  const box = $('chips'); box.textContent = '';
  for (const a of asks) {
    const b = document.createElement('button');
    b.type = 'button';
    const words = a.replace(/^Alexa, /, '');
    b.textContent = words[0].toUpperCase() + words.slice(1);
    b.addEventListener('click', () => ask(a));
    box.append(b);
  }
}

function worksRow() {
  const box = $('works'); box.textContent = '';
  for (const w of state.gallery.works) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = w.id;
    const t = document.createElement('div'); t.className = 'thumb';
    if (w.image) { const i = document.createElement('img'); i.src = w.image; i.alt = ''; i.loading = 'lazy'; t.append(i); }
    const s = document.createElement('span'); s.textContent = w.title;
    b.append(t, s);
    b.addEventListener('click', () => {
      stopTalking(); show(w);
      const say = `You are in front of ${w.title}. Ask me about it.`;
      caption('', say, '');
      tellScreen({ type: 'answer', workId: w.id, topic: 'about', question: '', say });
    });
    box.append(b);
  }
}

async function start() {
  let data = null;
  try { data = await (await fetch(`/api/gallery?slug=${encodeURIComponent(slug)}`)).json(); } catch { data = null; }
  if (!data?.ok || !data.gallery) {
    $('title').textContent = 'That gallery is not published.';
    $('reply').textContent = 'Check the link name, or open the sample gallery.';
    return;
  }
  const g = state.gallery = data.gallery;
  state.lang = g.languages[0];
  document.documentElement.style.setProperty('--accent', strong(g.accent));
  const sel = $('lang');
  for (const l of g.languages) { const o = document.createElement('option'); o.value = o.textContent = l; sel.append(o); }
  $('langWrap').hidden = g.languages.length < 2;
  sel.addEventListener('change', () => { state.lang = sel.value; });
  worksRow();
  chips();
  show(g.works.find((w) => w.id === params.get('at')) ?? g.works[0] ?? null);
  caption('', g.welcome || `Welcome to ${g.name}. Ask me about the work in front of you.`, '');
  setupMic();
  $('askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('q').value; $('q').value = ''; ask(v); });
}

start();
