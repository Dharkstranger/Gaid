import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

process.env.GALLERIS_LOCAL_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));
const { GET } = await import('../api/gallery.js');
const { POST } = await import('../api/ask.js');
const { allow } = await import('../lib/limit.js');

const post = (body) => POST(new Request('http://x/api/ask', { method: 'POST', body: JSON.stringify(body) }));

test('the gallery loads by link name and refuses a bad one', async () => {
  const ok = await (await GET(new Request('http://x/api/gallery?slug=sample'))).json();
  assert.equal(ok.ok, true);
  assert.equal(ok.gallery.works.length, 9);
  assert.equal((await GET(new Request('http://x/api/gallery?slug=../etc'))).status, 400);
  assert.equal((await GET(new Request('http://x/api/gallery?slug=nobody-here'))).status, 404);
});

test('a rule question is answered from the gallery', async () => {
  const r = await (await post({ slug: 'sample', workId: 'p1', question: 'Alexa, who made it?' })).json();
  assert.equal(r.ok, true);
  assert.equal(r.source, 'gallery');
  assert.match(r.say, /Adaeze Obi/);
});

test('an open question with no model switched on gets the gallery’s words, not an error', async () => {
  const r = await (await post({ slug: 'sample', workId: 'p1', question: 'Why those colours?' })).json();
  assert.equal(r.ok, true);
  assert.equal(r.source, 'gallery');
  assert.match(r.say, /only know what/);
});

test('a body that is not JSON is refused', async () => {
  const res = await POST(new Request('http://x/api/ask', { method: 'POST', body: 'nope' }));
  assert.equal(res.status, 400);
});

test('the brake stops the twenty-first question in a minute', () => {
  const t = 1_000_000;
  for (let i = 0; i < 20; i += 1) assert.equal(allow('one', t + i), true);
  assert.equal(allow('one', t + 21), false);
  assert.equal(allow('two', t + 21), true);
  assert.equal(allow('one', t + 61_000), true);
});
