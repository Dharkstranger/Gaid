/* Give your voice (/voice). A person — or an estate — fills in the consent,
   records a minute and more of the passage, reads the consent sentence live,
   and GAID's voice engine makes a voice ID only if the copy passes the
   likeness test (docs/voices.md). The recordings go from this browser
   straight to the engine with a half-hour pass from GAID's server; the
   server's own secret never reaches this page. */
import { W } from './words.js';

const $ = (id) => document.getElementById(id);
const MIN_S = 60;
const samples = [];          // { blob, seconds }
let consentBlob = null;

const kind = () => document.querySelector('input[name=kind]:checked').value;
const langs = () => [...document.querySelectorAll('input[name=lang]:checked')].map((x) => x.value);
const total = () => samples.reduce((n, s) => n + s.seconds, 0);

async function seconds(blob) {
  try {
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    ctx.close();
    return buf.duration;
  } catch { return 0; }
}

function showHeard() {
  $('heard').textContent = W.heard(Math.min(total(), 5999));
  $('heardBar').value = Math.min(total(), MIN_S);
}

function showConsent() {
  const d = new Date(`${$('at').value || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const said = Number.isNaN(d.getTime()) ? '…' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  $('consentText').textContent = W.say.consent($('name').value.trim() || '…', said);
  const estate = kind() === 'estate';
  $('consentStep').hidden = estate;
  $('formLink').textContent = estate ? W.estateForm : W.consentForm;
  $('formLink').href = $('formLink').href.replace(/[^/]+\.md$/, estate ? 'estate-permission.md' : 'voice-consent.md');
}

/* One recorder at a time; pressing again stops it. */
let recording = null;
async function toggle(button, done) {
  if (recording) { recording.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }); } catch { return; }
  const rec = new MediaRecorder(stream);
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    recording = null;
    button.textContent = W.record; button.setAttribute('aria-pressed', 'false');
    const blob = new Blob(parts, { type: rec.mimeType });
    await done(blob, await seconds(blob));
  };
  rec.start();
  recording = rec;
  button.textContent = W.stopRec; button.setAttribute('aria-pressed', 'true');
}

async function make() {
  const say = (k) => { $('state').textContent = W.voiceWhy[k] ?? k; };
  if (!$('who').reportValidity()) return;
  if (total() < MIN_S) return say('too-short');
  if (kind() === 'self' && !consentBlob) return say('no-consent-recording');
  $('made').hidden = true;
  $('make').setAttribute('aria-busy', 'true'); $('state').textContent = W.making;
  try {
    const pass = await (await fetch('/api/voice-ticket', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invite: $('invite').value }) })).json().catch(() => null);
    if (pass?.ok !== true) return say(pass?.why ?? 'network');
    const form = new FormData();
    for (const [k, v] of Object.entries({ ticket: pass.ticket, name: $('name').value.trim(), kind: kind(), at: $('at').value, ref: $('ref').value.trim(), languages: langs().join(',') })) form.append(k, v);
    samples.forEach((s, i) => form.append('samples', s.blob, `sample-${i}`));
    if (consentBlob && kind() === 'self') form.append('consent', consentBlob, 'consent');
    const res = await fetch(pass.url, { method: 'POST', body: form }).catch(() => null);
    const out = res ? await res.json().catch(() => null) : null;
    if (out?.ok !== true) return say(out?.why ?? 'network');
    $('state').textContent = '';
    $('likeness').textContent = W.likeness(out.check.ratio);
    $('record').textContent = JSON.stringify(out.record, null, 2);
    $('made').hidden = false;
  } finally { $('make').removeAttribute('aria-busy'); }
}

async function withdraw(e) {
  e.preventDefault();
  const out = await (await fetch('/api/voice-withdraw', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ invite: $('invite').value, voiceId: $('voiceId').value.trim() }) })).json().catch(() => null);
  $('outState').textContent = out?.ok === true ? W.withdrawn : (W.voiceWhy[out?.why] ?? W.voiceWhy.network);
}

function start() {
  for (const n of document.querySelectorAll('[data-w]')) { const v = W[n.dataset.w]; if (typeof v === 'string') n.textContent = v; }
  for (const line of W.passage) { const li = document.createElement('li'); li.textContent = line; $('passage').append(li); }
  $('at').value = new Date().toISOString().slice(0, 10);
  for (const id of ['name', 'at']) $(id).addEventListener('input', showConsent);
  for (const r of document.querySelectorAll('input[name=kind]')) r.addEventListener('change', showConsent);
  $('recSamples').addEventListener('click', () => toggle($('recSamples'), (blob, s) => { if (s > 0) samples.push({ blob, seconds: s }); showHeard(); }));
  $('files').addEventListener('change', async () => {
    for (const f of $('files').files) { const s = await seconds(f); if (s > 0) samples.push({ blob: f, seconds: s }); }
    $('files').value = ''; showHeard();
  });
  $('recConsent').addEventListener('click', () => toggle($('recConsent'), (blob, s) => { consentBlob = s >= 2 ? blob : null; $('consentState').textContent = consentBlob ? W.heard(s).split(' ')[0] : ''; }));
  $('make').addEventListener('click', make);
  $('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('record').textContent); $('copy').textContent = W.copied; } catch { /* select it by hand */ } });
  $('out').addEventListener('submit', withdraw);
  showConsent(); showHeard();
}

start();
