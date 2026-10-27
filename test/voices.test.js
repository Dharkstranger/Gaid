/* The voice library (lib/voices.js): GAID speaks in the voice the gallery
   chose for a work — and only a voice with consent, a passed likeness test,
   not withdrawn, in the language asked. The voice service is never reached
   from a test: stand-ins answer the way ElevenLabs and Polly do. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
const { voiceOf, refusal, pick } = await import('../lib/voices.js');
const { loadGallery } = await import('../lib/gallery.js');
const { seal } = await import('../lib/seal.js');
const polly = await import('../lib/polly.js');
const { POST } = await import('../api/speak.js');

const good = { id: 'v', name: 'Ada', provider: 'elevenlabs', voiceId: 'AdaVoice0001', languages: ['English'],
  consent: { kind: 'self', at: '2026-10-20', ref: 'c-1' }, check: { passed: true } };

test('a voice record is read strictly: anything malformed is no voice', () => {
  assert.equal(refusal(voiceOf(good)), '');
  assert.equal(voiceOf({ ...good, voiceId: '../../admin' }), null, 'a voice ID that is not one');
  assert.equal(voiceOf({ ...good, provider: 'someone' }), null);
  assert.equal(voiceOf({ ...good, id: '' }), null);
});

test('a voice speaks only with consent, a passed likeness test, not withdrawn, in its language', () => {
  assert.equal(refusal(voiceOf({ ...good, consent: undefined })), 'no-consent');
  assert.equal(refusal(voiceOf({ ...good, consent: { kind: 'self', at: '2026-10-20' } })), 'no-consent', 'no reference to a signed form');
  assert.equal(refusal(voiceOf({ ...good, consent: { kind: 'friend', at: '2026-10-20', ref: 'x' } })), 'no-consent', 'only the person, or an estate');
  assert.equal(refusal(voiceOf({ ...good, check: { passed: false, similarity: 0.5 } })), 'not-checked');
  assert.equal(refusal(voiceOf({ ...good, check: { passed: 'yes' } })), 'not-checked', 'true, not truthy');
  assert.equal(refusal(voiceOf({ ...good, withdrawn: true })), 'withdrawn');
  assert.equal(refusal(voiceOf(good), 'Yoruba'), 'language');
  assert.equal(voiceOf({ ...good, consent: { kind: 'estate', at: '2026-10-20', ref: 'e-1' } }).historical, true);
});

test('the work’s voice, then its artist’s, then the gallery’s; a refused one is skipped', async () => {
  const g = await loadGallery('voices');
  assert.equal(pick(g, g.works.find((w) => w.id === 'w1')).id, 'ada', 'the artist');
  assert.equal(pick(g, g.works.find((w) => w.id === 'w2')).id, 'curator', 'artist withdrawn: the gallery’s');
  assert.equal(pick(g, g.works.find((w) => w.id === 'w3')).id, 'curator', 'artist has no consent: the gallery’s');
  assert.equal(pick(g, g.works.find((w) => w.id === 'w1'), 'Yoruba'), null, 'nobody speaks Yoruba: GAID’s default');
});

function services() {
  const said = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const m = String(url).match(/^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/([^?]+)/);
    if (m) { said.push({ by: m[1], text: JSON.parse(init.body).text }); return new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); }
    return real(url, init);
  };
  polly.useSender(async (input) => { said.push({ by: `polly:${input.VoiceId}`, text: input.Text }); return { AudioStream: new Uint8Array([2]) }; });
  process.env.ELEVENLABS_API_KEY = 'k'; process.env.GAID_AWS_ACCESS_KEY_ID = 'a'; process.env.GAID_AWS_SECRET_ACCESS_KEY = 's';
  return { said, done: () => { globalThis.fetch = real; polly.useSender(null); for (const k of ['ELEVENLABS_API_KEY', 'GAID_AWS_ACCESS_KEY_ID', 'GAID_AWS_SECRET_ACCESS_KEY']) delete process.env[k]; } };
}
const speak = (slug, workId, say) => POST(new Request('http://x/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ voice: seal({ slug, workId, topic: 'voice', say }), lang: 'English' }) }));

test('GAID speaks a work’s words in the voice ID chosen for it', async () => {
  const s = services();
  try {
    assert.equal((await speak('voices', 'w1', 'A lagoon at dawn.')).status, 200);
    assert.deepEqual(s.said.at(-1), { by: 'AdaVoice0001', text: 'A lagoon at dawn.' });
    await speak('voices', 'w2', 'A portrait.');
    assert.equal(s.said.at(-1).by, 'CuratorVc03', 'a withdrawn voice is never used');
    assert.ok(!s.said.some((x) => x.by === 'ElderVoice02' || x.by === 'NobodyVc004'));
  } finally { s.done(); }
});

test('a voice is chosen from the seal, so one gallery’s voice cannot read another’s words', async () => {
  const s = services();
  try {
    await speak('sample', 'w1', 'Words from another gallery.');
    assert.equal(s.said.at(-1).by, 'polly:Ruth', 'the sample gallery has no voices: the Amazon voice');
  } finally { s.done(); }
});
