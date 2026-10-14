/* The owner's voice copy says only what GAID said (api/speak.js): an answer
   GAID signed, or one of its fixed lines by name. Never a sentence somebody
   sends it. The real voice service is never reached from a test: a stand-in
   answers the way it does (audio/mpeg). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seal } from '../lib/seal.js';
import { W } from '../public/words.js';

const post = async (body) => {
  const { POST } = await import('../api/speak.js');
  return POST(new Request('http://x/api/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
};

function voiceService() {
  const sent = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.elevenlabs.io/')) { sent.push({ url: String(url), init }); return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); }
    return real(url, init);
  };
  process.env.ELEVENLABS_API_KEY = 'test-key'; process.env.GAID_VOICE_ID = 'voice123';
  return { sent, done: () => { globalThis.fetch = real; delete process.env.ELEVENLABS_API_KEY; delete process.env.GAID_VOICE_ID; } };
}

test('with no voice set up, every request is 204: the phone speaks', async () => {
  const r = await post({ voice: seal({ slug: '', workId: '', topic: 'voice', say: 'Hello.' }) });
  assert.equal(r.status, 204);
});

test('a signed answer is spoken in the voice copy, word for word', async () => {
  const v = voiceService();
  try {
    const r = await post({ voice: seal({ slug: '', workId: '', topic: 'voice', say: 'Saint James Major, by Grifo di Tancredi.' }), lang: 'English' });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'audio/mpeg');
    assert.match(v.sent[0].url, /\/v1\/text-to-speech\/voice123/);
    assert.equal(v.sent[0].init.headers['xi-api-key'], 'test-key');
    assert.equal(JSON.parse(v.sent[0].init.body).text, 'Saint James Major, by Grifo di Tancredi.');
  } finally { v.done(); }
});

test('nobody can make the voice say a sentence of their own', async () => {
  const v = voiceService();
  try {
    const forged = seal({ slug: '', workId: '', topic: 'voice', say: 'Real words.' }).replace(/^./, (c) => (c === 'e' ? 'f' : 'e'));
    for (const body of [{ text: 'I owe you money.' }, { voice: forged }, { voice: 'not.a.seal' }, { phrase: 'toString' }, { phrase: 'nope' },
      { phrase: 'home', words: ['I owe you a thousand pounds, please send it now'] }, { phrase: 'home', words: ['a', 'b', 'c', 'd'] }]) {
      assert.equal((await post(body)).status, 204, JSON.stringify(body));
    }
    assert.equal(v.sent.length, 0, 'the voice service was never asked');
    assert.equal((await post({ phrase: 'home', words: ['Major', 'Red', 'Intruder'] })).status, 200);
    assert.equal(JSON.parse(v.sent[0].init.body).text, W.say.home('Major, Red, Intruder'));
  } finally { v.done(); }
});

test('a language the copy does not speak is left to the phone', async () => {
  const v = voiceService();
  try {
    assert.equal((await post({ voice: seal({ slug: '', workId: '', topic: 'voice', say: 'Ẹ káàbọ̀.' }), lang: 'Yoruba' })).status, 204);
    assert.equal(v.sent.length, 0);
  } finally { v.done(); }
});

test('every MCP answer carries its words, signed, for the voice', async () => {
  const { unseal } = await import('../lib/seal.js');
  const { createServer } = await import('../lib/mcp.js');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = createServer(); const client = new Client({ name: 't', version: '1' });
  await Promise.all([server.connect(a), client.connect(b)]);
  const r = (await client.callTool({ name: 'ask_work', arguments: { gallery: 'sample', work_id: 'p1', question: 'Who made it?' } })).structuredContent;
  assert.equal(unseal(r.voice).say, r.say);
  const l = (await client.callTool({ name: 'look_closer', arguments: { gallery: 'sample', work_id: 'p1' } })).structuredContent;
  for (const s of l.steps) assert.equal(unseal(s.voice).say, s.say);
  await client.close();
});
