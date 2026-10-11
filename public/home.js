/* GAID at home: the visit, through Alexa+. A simulated Echo Show.

   Every answer comes from GAID's MCP server (/api/mcp) — recall_visit,
   find_work, ask_work, send_enquiry — the tools Alexa+ would call. The
   visit is the code the phone gave the visitor; nothing about them is
   stored anywhere, and the enquiry is sent by them, never by GAID. */
import { W } from './words.js';
import { callTool } from './mcp-client.js';
import { readVisit } from './visit.js';
import { listen, say, hush, canListen } from './voice.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const EXAMPLE = 'sample~p1.p4.p9';
const code = readVisit(params.get('visit')) ? params.get('visit') : EXAMPLE;
const state = { slug: readVisit(code).slug, works: [], work: null, stop: null };

const WAKE = /^\s*(hey\s+|ok\s+)?(alexa|gaid|guide)(?!\s+(me|us)\b)[\s,.!:-]*/i;
const MEANS = {
  visit: /\b(what (did|have) i (see|seen)|my visit|remind me|what was (there|on))\b/i,
  enquire: /\b(enquir\w*|inquir\w*|ask the gallery|contact|message|buy|price|interested|available)\b/i,
  find: /\b(the (one|painting|picture|work|sculpture|print|mask|bronze)\b.*\b(with|of|in|by)\b|which (one|was)|find)\b/i,
};

function setVoice(s) {
  $('talk').dataset.state = s;
  $('talk').setAttribute('aria-pressed', String(s === 'listening'));
  $('talkWord').textContent = s === 'idle' ? W.talk : W[s];
}

function caption(you, reply, source = '') {
  $('you').hidden = !you; $('you').textContent = you ? `You: ${you}` : '';
  $('reply').textContent = reply;
  $('source').hidden = !source;
  $('source').textContent = source === 'nova' ? W.fromNova : source === 'gallery' ? W.fromGallery : '';
}

function showWork(w) {
  state.work = w;
  $('title').textContent = w?.title ?? W.name;
  $('meta').textContent = w ? [w.artist, w.year, w.medium].filter(Boolean).join(' · ') : '';
  const art = $('art');
  if (w?.image) { art.src = w.image; art.alt = `${w.title}${w.artist ? ', ' + w.artist : ''}`; art.hidden = false; $('noart').hidden = true; }
  else { art.removeAttribute('src'); art.hidden = true; $('noart').hidden = false; }
  for (const b of document.querySelectorAll('.works button')) b.setAttribute('aria-current', String(b.dataset.id === w?.id));
  $('sendBox').hidden = true;
}

function strip(works) {
  const box = $('works'); box.textContent = '';
  for (const w of works) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = w.id;
    const t = document.createElement('div'); t.className = 'thumb';
    if (w.image) { const i = document.createElement('img'); i.src = w.image; i.alt = ''; t.append(i); }
    const s = document.createElement('span'); s.textContent = w.title;
    b.append(t, s);
    b.addEventListener('click', () => { hush(); showWork(w); caption('', W.at(w.title)); });
    box.append(b);
  }
}

async function ask(raw) {
  const q = String(raw ?? '').trim();
  if (!q) return;
  hush();
  const rest = q.replace(WAKE, '');
  const plain = rest.charAt(0).toUpperCase() + rest.slice(1);
  caption(plain, W.thinking);
  let out = null;
  if (MEANS.visit.test(plain)) {
    out = await callTool('recall_visit', { visit: code });
    if (out?.works?.length) { state.works = out.works; strip(out.works); showWork(out.works[0]); }
  } else if (MEANS.enquire.test(plain) && state.work) {
    out = await callTool('send_enquiry', { gallery: state.slug, work_id: state.work.id });
    if (out?.href) {
      const how = out.channel === 'whatsapp' ? 'WhatsApp' : 'Email';
      $('send').href = out.href; $('send').textContent = W.send(how); $('sendBox').hidden = false;
    }
  } else if (MEANS.find.test(plain)) {
    out = await callTool('find_work', { gallery: state.slug, description: plain });
    // What they saw first: the visit is what they are remembering.
    const hit = out?.works?.find((w) => state.works.some((v) => v.id === w.id)) ?? out?.works?.[0];
    if (hit) {
      showWork(state.works.find((w) => w.id === hit.id) ?? hit);
      out = { ...out, say: `${hit.title}${hit.artist ? `, by ${hit.artist}` : ''}${hit.year ? `, ${hit.year}` : ''}.` };
    }
  } else {
    out = await callTool('ask_work', { gallery: state.slug, work_id: state.work?.id, question: plain });
  }
  if (!out) { caption(plain, W.offline); return; }
  const keep = !$('sendBox').hidden;
  caption(plain, out.say, out.source);
  $('sendBox').hidden = !keep;
  say(out.say, { onState: setVoice });
}

async function start() {
  for (const n of document.querySelectorAll('[data-w]')) { const v = W[n.dataset.w]; if (typeof v === 'string') n.textContent = v; }
  $('q').placeholder = W.homeHint;
  if (code === EXAMPLE) { $('whose').textContent = W.exampleVisit; $('visitH').textContent = W.exampleVisit; }
  const box = $('chips');
  for (const [label, question] of W.homeChips) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => ask(question));
    box.append(b);
  }
  const out = await callTool('recall_visit', { visit: code });
  if (out?.works?.length) { state.works = out.works; strip(out.works); showWork(out.works[0]); caption('', out.say); }
  else caption('', out?.say ?? W.offline);

  if (!canListen) $('talk').hidden = true;
  $('talk').addEventListener('click', () => {
    if (state.stop) { state.stop(); state.stop = null; return; }
    hush();
    state.stop = listen({ onHeard: (w) => { $('q').value = w; }, onText: (t) => { $('q').value = ''; ask(t); }, onState: (s) => { setVoice(s); if (s === 'idle') state.stop = null; } });
  });
  $('askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('q').value; $('q').value = ''; ask(v); });
}

start();
