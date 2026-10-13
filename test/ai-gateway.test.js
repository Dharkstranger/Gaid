/* Amazon Nova through Vercel's AI Gateway, for an owner with no AWS account.
   The real gateway is never reached from a test (test/setup.js): a stand-in
   answers the way the gateway's chat-completions endpoint does. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim } from '../lib/gallery.js';

const gallery = slim(JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url))));
const work = gallery.works[0];

function stub(reply) {
  const seen = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://ai-gateway.vercel.sh/v1/chat/completions') { seen.push({ url, init }); return reply(); }
    return real(url, init);
  };
  return { seen, restore: () => { globalThis.fetch = real; } };
}

test('with a gateway key, a question goes to Amazon Nova through the gateway, with the gallery’s facts', async () => {
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  const { askModel, enabled, GATEWAY_MODEL } = await import('../lib/bedrock.js');
  const s = stub(() => new Response(JSON.stringify({ choices: [{ message: { content: 'The *gallery* has not said.' } }] }), { status: 200 }));
  try {
    assert.equal(enabled(), true);
    const said = await askModel({ gallery, work, question: 'Who owns it?', lang: 'English' });
    assert.equal(said, 'The gallery has not said.');
    const body = JSON.parse(s.seen[0].init.body);
    assert.equal(body.model, GATEWAY_MODEL);
    assert.match(GATEWAY_MODEL, /^amazon\/nova/);
    assert.equal(s.seen[0].init.headers.authorization, 'Bearer test-key');
    assert.equal(body.messages[0].role, 'system');
    assert.ok(body.messages[0].content.includes(work.title), 'the facts travel in the instructions');
    assert.deepEqual(body.messages.at(-1), { role: 'user', content: 'Who owns it?' });
  } finally { s.restore(); delete process.env.AI_GATEWAY_API_KEY; }
});

test('a gateway that fails is null, never an error a visitor sees', async () => {
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  const { askModel, converse } = await import('../lib/bedrock.js');
  const s = stub(() => new Response('{"error":"insufficient credits"}', { status: 402 }));
  try {
    assert.equal(await askModel({ gallery, work, question: 'Why?', lang: 'English' }), null);
    assert.equal(await converse('Translate.', 'Hello'), null);
  } finally { s.restore(); delete process.env.AI_GATEWAY_API_KEY; }
});

test('GAID_NOVA=off closes the gateway road', async () => {
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  process.env.GAID_NOVA = 'off';
  const { enabled } = await import('../lib/bedrock.js');
  try { assert.equal(enabled(), false); } finally { delete process.env.AI_GATEWAY_API_KEY; delete process.env.GAID_NOVA; }
});
