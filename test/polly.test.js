/* The Amazon voice (lib/polly.js) speaks GAID's own signed words, after a
   gallery's own voice if one is set and refuses. Amazon is never reached
   from a test: a stand-in answers the way Polly does (an audio stream). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seal } from '../lib/seal.js';
import * as polly from '../lib/polly.js';

const post = async (body) => {
  const { POST } = await import('../api/speak.js');
  return POST(new Request('http://x/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
};
const signed = (say) => seal({ slug: '', workId: '', topic: 'voice', say });

function amazon(answer = () => ({ AudioStream: new Uint8Array([7, 7, 7]) })) {
  const sent = [];
  polly.useSender(async (input) => { sent.push(input); return answer(input); });
  process.env.GAID_AWS_ACCESS_KEY_ID = 'AKIATEST'; process.env.GAID_AWS_SECRET_ACCESS_KEY = 'secret';
  return { sent, done: () => { polly.useSender(null); delete process.env.GAID_AWS_ACCESS_KEY_ID; delete process.env.GAID_AWS_SECRET_ACCESS_KEY; } };
}

test('with Amazon set up, a signed answer is spoken in one Amazon voice, word for word', async () => {
  const a = amazon();
  try {
    const r = await post({ voice: signed('Saint James Major, by Grifo di Tancredi.'), lang: 'English' });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'audio/mpeg');
    assert.equal(a.sent[0].Text, 'Saint James Major, by Grifo di Tancredi.');
    assert.equal(a.sent[0].VoiceId, 'Ruth');
    assert.equal(a.sent[0].Engine, 'generative');
  } finally { a.done(); }
});

test('a voice without the generative engine falls back to neural, not to the phone', async () => {
  const a = amazon((input) => {
    if (input.Engine === 'generative') throw Object.assign(new Error('no'), { name: 'EngineNotSupportedException' });
    return { AudioStream: new Uint8Array([1]) };
  });
  try {
    assert.equal((await post({ voice: signed('Hello.'), lang: 'English' })).status, 200);
    assert.deepEqual(a.sent.map((s) => s.Engine), ['generative', 'neural']);
  } finally { a.done(); }
});

test('nobody can make the Amazon voice say a sentence of their own', async () => {
  const a = amazon();
  try {
    for (const body of [{ text: 'I owe you money.' }, { voice: 'not.a.seal' }, { phrase: 'nope' }]) {
      assert.equal((await post(body)).status, 204, JSON.stringify(body));
    }
    assert.equal(a.sent.length, 0);
  } finally { a.done(); }
});

test('Yoruba is left to the gallery’s recording or the phone; Amazon has no Yoruba voice', async () => {
  const a = amazon();
  try {
    assert.equal((await post({ voice: signed('Ẹ káàbọ̀.'), lang: 'Yoruba' })).status, 204);
    assert.equal(a.sent.length, 0);
  } finally { a.done(); }
});

test('a gallery’s own voice that refuses (an unpaid plan) hands over to the Amazon voice', async () => {
  const a = amazon();
  const real = globalThis.fetch;
  let asked = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.elevenlabs.io/')) { asked += 1; return Response.json({ detail: { status: 'payment_required' } }, { status: 402 }); }
    return real(url, init);
  };
  process.env.ELEVENLABS_API_KEY = 'k'; process.env.GAID_VOICE_ID = 'v';
  try {
    const r = await post({ voice: signed('Hello again.'), lang: 'English' });
    assert.equal(r.status, 200, 'the Amazon voice spoke');
    assert.equal(a.sent.length, 1);
    await post({ voice: signed('And again.'), lang: 'English' });
    assert.equal(asked, 1, 'an account refusal is not asked again every time');
  } finally {
    a.done(); globalThis.fetch = real; delete process.env.ELEVENLABS_API_KEY; delete process.env.GAID_VOICE_ID;
    (await import('../lib/clone.js')).wake();
  }
});
