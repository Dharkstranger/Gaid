/* The visitor's side of GAID, below the screen: the three words, where next,
   look closer, and the gallery's words in another language. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim } from '../lib/gallery.js';
import { keywordOf, visitWords, worksFromWords } from '../public/visit.js';
import { nextWork, sayNext } from '../lib/next.js';
import { lookCloser, sentences } from '../lib/look.js';
import { systemFor, LANGS } from '../lib/translate.js';

const g = slim(JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url))));

test('every work has one word, and no two works share it', () => {
  const words = g.works.map((w) => keywordOf(w, g.works));
  assert.deepEqual(words, ['Lagoon', 'Peaks', 'Wall', 'Mask', 'Towers', 'Eclipse', 'Wing', 'Figure', 'Crossing']);
  assert.equal(new Set(words).size, words.length);
});

test('a clash falls back to a word nobody else uses', () => {
  const works = [{ id: 'a', title: 'Red mask' }, { id: 'b', title: 'Ceremonial mask' }];
  assert.equal(keywordOf(works[0], works), 'Red');
  assert.equal(keywordOf(works[1], works), 'Ceremonial');
});

test('the visit is the last three works, and comes back from the words', () => {
  assert.deepEqual(visitWords(g.works, ['p2', 'p1', 'p4', 'p9']), ['Lagoon', 'Mask', 'Crossing']);
  assert.deepEqual(worksFromWords(g.works, 'lagoon MASK, crossing').map((w) => w.id), ['p1', 'p4', 'p9']);
  assert.deepEqual(worksFromWords(g.works, 'Lagoon, banana').map((w) => w.id), ['p1'], 'unknown words are skipped');
});

test('where next prefers the same hand, then the room, and skips what was seen', () => {
  const mask = g.works.find((w) => w.id === 'p4');
  assert.equal(nextWork(g, mask, ['p4']).work.id, 'p8');
  const all = g.works.map((w) => w.id);
  assert.ok(nextWork(g, mask, all), 'when everything is seen, still somewhere to go');
  assert.match(sayNext(g, mask, nextWork(g, mask, ['p4'])), /^Next: Standing figure, also by Chinedu Mbah\.$/);
});

test('look closer is the gallery’s words, sentence by sentence, never more', async () => {
  const w = g.works.find((x) => x.id === 'p1');
  const steps = await lookCloser(g, w, 'English');
  assert.deepEqual(steps.slice(1).map((s) => s.say), sentences(w.guide.English));
  const drift = await lookCloser(g, g.works.find((x) => x.id === 'p3'), 'English');
  assert.equal(drift.length, 2, 'a work with no spots still moves');
});

test('translation keeps names, dates and numbers, adds nothing, and is offered for Nigerian languages', () => {
  for (const l of ['Pidgin', 'Yoruba', 'Igbo', 'Hausa']) assert.ok(LANGS.includes(l), l);
  const s = systemFor('Yoruba');
  assert.match(s, /Keep every name, title, place, date and number exactly/);
  assert.match(s, /Add nothing/);
  assert.match(s, /tone marks/);
});

test('with no Amazon key, another language falls back to the gallery’s own words', async () => {
  process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
  const { ask } = await import('../lib/guide.js');
  const out = await ask({ slug: 'sample', workId: 'p1', question: 'Who made it?', lang: 'Pidgin' });
  assert.match(out.say, /^Adaeze Obi/);
  assert.equal(out.translated, undefined);
  assert.equal(out.lang, 'English');
});
