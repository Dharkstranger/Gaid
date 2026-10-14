/* GAID at home: the visit, through Alexa+, on an Echo Show.

   Opened from the three words GAID gave the visitor as they left
   (/home?gallery=openaccess&words=Major,+Red,+Intruder) — or a visit code.
   Look and listen, like the phone: the work, the visit as pictures, one
   talk button. Every answer is a call to GAID's MCP server, the tools
   Alexa+ would call: recall_visit, find_work, ask_work, send_enquiry.
   The enquiry is a button the visitor presses; GAID sends nothing. */
import { galleryOf } from './config.js';
import { W } from './words.js';
import { callTool } from './mcp-client.js';
import { listen, say, hush, canListen, sayNatural, useNatural } from './voice.js';
import { intentOf } from './intent.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = galleryOf(params);
const EXAMPLE = 'Major, Red, Intruder';
const words = params.get('words') || (params.get('visit') ? '' : EXAMPLE);
const visit = params.get('visit') || '';
const state = { works: [], work: null, cc: false, stop: null, started: false, said: '' };

function setVoice(s) {
  $('talk').dataset.state = s;
  $('talk').setAttribute('aria-pressed', String(s === 'listening'));
  $('talk').setAttribute('aria-label', s === 'idle' ? W.talk : W[s] ?? W.talk);
}
function caption(text) {
  state.said = text ?? '';
  $('cap').textContent = state.said;
  $('cap').hidden = !(state.cc && state.said);
}
async function speak(text, voice) {
  caption(text);
  if (await sayNatural({ voice, onState: setVoice })) return;
  await say(text, { onState: setVoice });
}

function show(w) {
  state.work = w;
  $('art').src = w?.image || '/brand/gaid-mark.svg';
  $('art').alt = w ? `${w.title}${w.artist ? ', ' + w.artist : ''}` : '';
  $('h1').textContent = w?.title ?? 'GAID';
  for (const b of document.querySelectorAll('#works button')) b.setAttribute('aria-current', String(b.dataset.id === w?.id));
  $('sendBox').hidden = true;
}

function strip(works) {
  const box = $('works'); box.textContent = '';
  for (const w of works) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = w.id; b.setAttribute('aria-label', W.goTo(w.title));
    const i = document.createElement('img'); i.src = w.image || '/brand/gaid-mark.svg'; i.alt = '';
    b.append(i);
    b.addEventListener('click', () => { hush(); show(w); ask(W.chips[0][1]); });
    box.append(b);
  }
}

async function recall() {
  setVoice('thinking');
  const out = await callTool('recall_visit', visit ? { visit } : { gallery: slug, words });
  if (out?.works?.length) { state.works = out.works; strip(out.works); show(out.works[0]); }
  setVoice('idle');
  return out;
}

async function enquire() {
  if (!state.work) return;
  hush(); setVoice('thinking');
  const out = await callTool('send_enquiry', { gallery: slug, work_id: state.work.id });
  setVoice('idle');
  if (!out) return speak(W.say.offline);
  if (out.href) {
    const how = out.channel === 'whatsapp' ? 'WhatsApp' : 'Email';
    $('send').href = out.href; $('send').setAttribute('aria-label', W.sendOn(how));
    $('sendBox').hidden = false;
  }
  await speak(out.say, out.voice);
}

async function ask(raw) {
  const { q, intent } = intentOf(raw);
  if (!q) return;
  hush();
  let out = null;
  if (intent === 'here') {                      // about the work on screen: never a search
    setVoice('thinking');
    out = await callTool('ask_work', { gallery: slug, work_id: state.work?.id, question: q });
  } else if (intent === 'visit') out = await recall();
  else if (intent === 'enquire') return enquire();
  else if (intent === 'find') {
    setVoice('thinking');
    out = await callTool('find_work', { gallery: slug, description: q });
    // What they saw first: the visit is what they are remembering.
    const hit = out?.works?.find((w) => state.works.some((v) => v.id === w.id)) ?? out?.works?.[0];
    if (hit) show(state.works.find((w) => w.id === hit.id) ?? hit);
  } else {
    setVoice('thinking');
    out = await callTool('ask_work', { gallery: slug, work_id: state.work?.id, question: q });
  }
  setVoice('idle');
  // "Next artwork": the screen moves to it, then says it.
  if (out?.action?.type === 'goto') { const w = state.works.find((x) => x.id === out.action.id) ?? (out.work?.id === out.action.id ? out.work : null); if (w) show(w); }
  await speak(out?.say ?? W.say.offline, out?.voice);
}

async function begin() {
  if (state.started) return;
  state.started = true;
  $('start').hidden = true;
  const out = await recall();
  await speak(out?.say ?? W.say.offline, out?.voice);
}

async function start() {
  // Whether the owner's voice copy is set up for this gallery.
  fetch(`/api/gallery?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => useNatural(d?.voice === true)).catch(() => {});
  for (const el of document.querySelectorAll('[data-aria]')) { const v = W[el.dataset.aria]; if (typeof v === 'string') el.setAttribute('aria-label', v); }
  setVoice('idle');
  await recall();                                  // the pictures, before the first tap
  $('start').addEventListener('click', begin);
  $('talk').addEventListener('click', () => {
    if (!state.started) return begin();
    if ($('talk').dataset.state !== 'idle') { state.stop?.(); state.stop = null; hush(); return setVoice('idle'); }
    if (!canListen) return ask(W.chips[0][1]);
    state.stop = listen({ onText: (t) => ask(t), onState: (s) => { setVoice(s); if (s === 'idle') state.stop = null; } });
  });
  $('visit').addEventListener('click', async () => { state.started = true; $('start').hidden = true; const out = await recall(); await speak(out?.say ?? W.say.offline, out?.voice); });
  $('enquire').addEventListener('click', () => { state.started = true; $('start').hidden = true; enquire(); });
  $('cc').addEventListener('click', () => { state.cc = !state.cc; $('cc').setAttribute('aria-pressed', String(state.cc)); caption(state.said); });
}

start();
