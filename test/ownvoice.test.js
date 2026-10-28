/* GAID's own voice engine, from GAID's side: a work's words in a voice ID the
   engine made, the fallback when the engine is cold, and the pass a browser
   gets to upload recordings. The engine is a stand-in here; voice/tests holds
   its own tests, and .github/workflows/voice-engine.yml runs the real model. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
const VID = 'gv0123456789abcdef';
process.env.GAID_VOICES = JSON.stringify({ sample: { voice: 'emeka', voices: [{ id: 'emeka', name: 'Emeka Ugochukwu', provider: 'gaid', voiceId: VID,
  languages: ['English'], consent: { kind: 'self', at: '2026-10-28', ref: 'consent-001' }, check: { passed: true, similarity: 0.71, at: '2026-10-28' } }] } });
const { seal } = await import('../lib/seal.js');
const polly = await import('../lib/polly.js');
const { POST: speak } = await import('../api/speak.js');
const { POST: ticketPOST } = await import('../api/voice-ticket.js');
const { ticket } = await import('../lib/voiceticket.js');

function engine(answer = () => new Response(new Uint8Array([0xff, 0xfb, 1]), { headers: { 'content-type': 'audio/mpeg' } })) {
  const sent = []; const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://engine.example/')) { sent.push({ url: String(url), init, body: JSON.parse(init.body) }); return answer(); }
    return real(url, init);
  };
  polly.useSender(async (i) => { sent.push({ by: 'polly', text: i.Text }); return { AudioStream: new Uint8Array([2]) }; });
  Object.assign(process.env, { GAID_VOICE_URL: 'https://engine.example', GAID_VOICE_TOKEN: 'shared', GAID_AWS_ACCESS_KEY_ID: 'a', GAID_AWS_SECRET_ACCESS_KEY: 's' });
  return { sent, done: () => { globalThis.fetch = real; polly.useSender(null); for (const k of ['GAID_VOICE_URL', 'GAID_VOICE_TOKEN', 'GAID_AWS_ACCESS_KEY_ID', 'GAID_AWS_SECRET_ACCESS_KEY']) delete process.env[k]; } };
}
const say = (text) => speak(new Request('http://x/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ voice: seal({ slug: 'sample', workId: 'p1', topic: 'voice', say: text }), lang: 'English' }) }));

test('a work’s words are spoken by GAID’s own engine, in the voice ID chosen for it', async () => {
  const e = engine();
  try {
    const r = await say('Sunrise over the lagoon, by Adaeze Obi.');
    assert.equal(r.status, 200);
    assert.equal(e.sent[0].url, 'https://engine.example/speak');
    assert.equal(e.sent[0].init.headers.authorization, 'Bearer shared');
    assert.deepEqual(e.sent[0].body, { voiceId: VID, text: 'Sunrise over the lagoon, by Adaeze Obi.', lang: 'English' });
  } finally { e.done(); }
});

test('a cold or failing engine hands over to the Amazon voice; the visitor still hears it', async () => {
  const e = engine(() => new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } }));
  try {
    assert.equal((await say('A second answer.')).status, 200);
    assert.equal(e.sent.at(-1).by, 'polly');
  } finally { e.done(); }
});

test('the upload pass: only with the invitation, and only if the engine is set up', async () => {
  const post = (invite) => ticketPOST(new Request('http://x/api/voice-ticket', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': `9.9.9.${Math.random()}` }, body: JSON.stringify({ invite }) }));
  assert.equal((await post('anything')).status, 503, 'engine not set up');
  const e = engine(); process.env.GAID_VOICE_INVITE = 'lagos-2026';
  try {
    assert.equal((await post('wrong')).status, 403);
    const ok = await (await post(' lagos-2026 ')).json();
    assert.equal(ok.ok, true);
    assert.equal(ok.url, 'https://engine.example/enrol');
    assert.equal(JSON.stringify(ok).includes('shared'), false, 'the token itself never leaves the server');
  } finally { e.done(); delete process.env.GAID_VOICE_INVITE; }
});

test('the engine accepts a pass Node made, and refuses one signed with another secret', (t) => {
  const py = (tk, secret) => spawnSync('python3', ['-c', 'import sys; from voice import store; print(store.ticket_ok(sys.argv[1], sys.argv[2]))', tk, secret],
    { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const probe = py('x.y', 's');
  if (probe.status !== 0) { t.skip('python3 with numpy not available here'); return; }
  assert.equal(py(ticket('shared'), 'shared').stdout.trim(), 'True');
  assert.equal(py(ticket('shared'), 'other').stdout.trim(), 'False');
  assert.equal(py(ticket('shared', 'speak'), 'shared').stdout.trim(), 'False');
});
