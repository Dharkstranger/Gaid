/* The contract with Galleris (its handover, 16 October): what GAID reads,
   how it answers, and what it must never do. One check per promise. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
const { slim, isOpen } = await import('../lib/gallery.js');
const { answer, upTo } = await import('../lib/answer.js');
const { ask } = await import('../lib/guide.js');
const { POST: askPOST } = await import('../api/ask.js');
const { systemFor } = await import('../lib/bedrock.js');
const { W } = await import('../public/words.js');

const galleryWith = (piece, extra = {}) => slim({
  slug: 'room', publishedAt: '2026-10-01T00:00:00Z', brand: { name: 'Room Gallery' },
  info: { whatsapp: '+234 801 234 5678' }, languages: ['English'],
  artists: [{ id: 'a', name: 'Ada Obi', bio: 'Painter from Lagos. Studied in Zaria. Shows widely.' }],
  pieces: [{ id: 'w1', title: 'Harmattan', artistId: 'a', ...piece }], ...extra,
});
const ask1 = (g, question) => answer({ gallery: g, work: g.works[0], question, lang: 'English' });

test('for sale: the status, and a price only where the gallery showed one', () => {
  let g = galleryWith({ sale: { status: 'available', price: 2500000, currency: 'NGN' } });
  assert.equal(ask1(g, 'Is it for sale?').say, 'Harmattan is available, at 2,500,000 Nigerian nairas.');
  g = galleryWith({ sale: { status: 'available' } });
  assert.equal(ask1(g, 'How much is it?').say, 'Harmattan is available. Price on request.');
  g = galleryWith({ sale: { status: 'sold', price: 900 } });
  assert.equal(ask1(g, 'Can I buy it?').say, 'Harmattan has been sold.');
  g = galleryWith({ sale: { status: 'reserved', price: 900 } });
  assert.equal(ask1(g, 'Is it available?').say, 'Harmattan is reserved.');
  g = galleryWith({});
  assert.equal(ask1(g, 'What does it cost?').say, 'The gallery has not said whether Harmattan is for sale.');
});

test('never a value, a note, or a price outside sale.price', () => {
  const g = galleryWith({ value: 999999, notes: 'Insured for 999999', sale: { status: 'available' } });
  const w = g.works[0];
  assert.equal(JSON.stringify(w).includes('999999'), false);
  assert.equal(systemFor(g, w, 'English').includes('999999'), false);
  // A status GAID does not know is no status at all: never "available".
  assert.equal(galleryWith({ sale: { status: 'maybe', price: 5 } }).works[0].sale, null);
});

test('a gallery with no publication date is a draft: GAID does not answer about it', () => {
  const on = { plan: 'paid', gaid: { on: true } };
  assert.equal(isOpen({ ...on, publishedAt: '2026-10-01T00:00:00Z' }, 'room'), true);
  for (const publishedAt of [undefined, '', '  ', 'not a date', 42]) {
    assert.equal(isOpen({ ...on, publishedAt }, 'room'), false, String(publishedAt));
  }
});

test('the gallery has not said: the gallery’s contact is offered, once', async () => {
  const first = await ask({ slug: 'sample', workId: 'p1', question: 'What does it cost?' });
  assert.match(first.say, /has not said whether .* for sale\. You can ask the gallery on email\. Press Enquire\.$/);
  assert.equal(first.enquire.channel, 'email');
  assert.match(first.enquire.href, /^mailto:hello@example\.org\?subject=Sunrise/);
  const again = await ask({ slug: 'sample', workId: 'p1', question: 'Is it for sale?', offered: true });
  assert.doesNotMatch(again.say, /Press Enquire/);
  assert.ok(again.enquire, 'the button stays; only the spoken offer is once');
  const answered = await ask({ slug: 'sample', workId: 'p1', question: 'Who made it?' });
  assert.equal(answered.enquire, undefined, 'nothing offered when the gallery has answered');
});

test('two sentences, then stop', () => {
  assert.equal(upTo('One. Two. Three.', 2), 'One. Two.');
  const g = galleryWith({});
  assert.equal(ask1(g, 'Who made it?').say, 'Ada Obi. Painter from Lagos.');
  assert.match(systemFor(g, g.works[0], 'English'), /two short sentences, then stop/);
});

test('Galleris’s Ask button gets { ok, answer, sources, unknown }, and ok is a boolean', async () => {
  const post = async (body) => (await askPOST(new Request('http://x/api/ask', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }))).json();
  const hit = await post({ slug: 'sample', at: 'p1', lang: 'English', question: 'Why is the sun so large?', device: 'ab'.repeat(32) });
  assert.equal(hit.ok, true);
  assert.equal(typeof hit.answer, 'string');
  assert.deepEqual(hit.sources, ['faq:0']);
  assert.equal(hit.unknown, false);
  const miss = await post({ slug: 'sample', at: 'p1', question: 'Is it for sale?' });
  assert.equal(miss.unknown, true);
  assert.deepEqual(miss.sources, []);
  const gone = await post({ slug: 'no-such-gallery', at: 'p1', question: 'Hello?' });
  assert.equal(gone.ok, false);
});

test('GAID is a living label: never "an AI", never a person', () => {
  const g = galleryWith({});
  for (const q of ['Are you AI?', 'What are you?', 'Who are you?', 'Are you a robot?', 'Who made you?']) {
    const out = ask1(g, q);
    assert.equal(out.say, W.say.whoAmI('Room Gallery'), q);
    assert.doesNotMatch(out.say, /\b(AI|artificial|robot|bot|model|assistant)\b/i, q);
  }
  assert.match(ask1(g, 'Are you a human?').say, /^No\. I am GAID, a living label/);
  assert.match(systemFor(g, g.works[0], 'English'), /living label/);
});
