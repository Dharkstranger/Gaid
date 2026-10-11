/* GAID's server is the only door (docs/architecture.md): who gets answers,
   what a TV may show, and how fast anyone may ask. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
const { ask } = await import('../lib/guide.js');
const { seal, unseal, MAX_AGE_MS } = await import('../lib/seal.js');
const { allow } = await import('../lib/limit.js');
const { GET: galleryGET } = await import('../api/gallery.js');
const { POST: sealPOST } = await import('../api/seal.js');
const { POST: mcpPOST } = await import('../api/mcp.js');

test('GAID answers only galleries that switched it on, on a paid plan — and its own demos', async () => {
  for (const [slug, open] of [['sample', true], ['paid-on', true], ['paid-off', false], ['free-on', false]]) {
    const out = await ask({ slug, workId: 'p1', question: 'Who made it?' });
    assert.equal(Boolean(out.closed), !open, slug);
    if (!open) assert.match(out.say, /has not switched GAID on\./, slug);
    else assert.match(out.say, /^Adaeze Obi/, slug);
  }
});

test('a switched-off gallery shows its name and nothing else', async () => {
  const res = await galleryGET(new Request('http://x/api/gallery?slug=paid-off'));
  const body = await res.json();
  assert.deepEqual(body, { ok: false, why: 'not-on', name: 'Test paid-off' });
});

test('a file calling itself "sample" is not a demo', async () => {
  const { slim, isOpen } = await import('../lib/gallery.js');
  assert.equal(isOpen({ slug: 'sample' }, 'someone-else'), false);
  assert.equal(slim({ slug: 'sample', pieces: [] }) !== null, true);
});

test('a seal opens only unaltered and fresh', () => {
  const t = seal({ slug: 'sample', workId: 'p1', topic: 'artist', say: 'Adaeze Obi.' });
  assert.deepEqual(unseal(t), { slug: 'sample', workId: 'p1', topic: 'artist', say: 'Adaeze Obi.' });
  const [body, mac] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ s: 'sample', w: 'p1', t: 'artist', a: 'Something rude', i: Date.now() })).toString('base64url');
  assert.equal(unseal(`${forged}.${mac}`), null, 'altered words');
  assert.equal(unseal(`${body}.${'A'.repeat(mac.length)}`), null, 'wrong signature');
  assert.equal(unseal('not a seal'), null);
  assert.equal(unseal(t, Date.now() + MAX_AGE_MS + 1000), null, 'stale');
});

test('every answer carries a seal for the screen beside the work', async () => {
  const out = await ask({ slug: 'sample', workId: 'p8', question: 'How big is it?' });
  assert.deepEqual(unseal(out.seal), { slug: 'sample', workId: 'p8', topic: 'size', say: '164 cm high.' });
});

test('the TV’s door opens a real seal and refuses a forged one', async () => {
  const good = seal({ slug: 'sample', workId: 'p1', topic: 'date', say: 'From 1974.' });
  const ok = await (await sealPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ seal: good }) }))).json();
  assert.equal(ok.answer.say, 'From 1974.');
  const bad = await sealPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ seal: (([b, m]) => `${b}.${m[0] === 'A' ? 'B' : 'A'}${m.slice(1)}`)(good.split('.')) }) }));
  assert.equal(bad.status, 403);
});

test('a caller asking too fast is slowed, others are not', async () => {
  for (let i = 0; i < 3; i += 1) assert.equal(allow('a', 1000, 3, 'x'), true);
  assert.equal(allow('a', 1000, 3, 'x'), false);
  assert.equal(allow('b', 1000, 3, 'x'), true, 'another caller');
  assert.equal(allow('a', 62_000, 3, 'x'), true, 'a minute later');
  const call = () => mcpPOST(new Request('http://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-real-ip': '203.0.113.7' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  }));
  let last;
  for (let i = 0; i <= 120; i += 1) last = await call();
  assert.equal(last.status, 429);
});
