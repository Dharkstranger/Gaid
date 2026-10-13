/* More for the guide to say: what the curator wrote beyond the description
   (Galleris `faq` and `background`, on a work and on the gallery), and the
   credit line, accession number and exhibitions it already publishes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim } from '../lib/gallery.js';
import { answer, faqHit } from '../lib/answer.js';
import { factsFor } from '../lib/bedrock.js';

const raw = JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url)));
const g = slim(raw);
const w = g.works.find((x) => x.id === raw.pieces[0].id);
const ask = (question) => answer({ gallery: g, work: w, question, lang: 'English' });

test('questions and answers and background are read; broken rows are dropped, never guessed', () => {
  assert.equal(w.faq.length, 1, 'only the one complete row survives');
  assert.match(w.background, /bus ticket/);
  assert.equal(g.faq[0].a, 'Yes, without flash.');
  assert.match(g.background, /boatyard/);
  const many = slim({ ...raw, info: { ...raw.info, faq: Array.from({ length: 40 }, (_, i) => ({ q: `q${i}`, a: 'a' })) } });
  assert.equal(many.faq.length, 20, 'capped');
});

test('the curator’s own answer is given word for word, from the work or the gallery', () => {
  assert.equal(ask('why is the sun so big and large?').say, w.faq[0].a);
  assert.equal(ask('can I take photos?').say, 'Yes, without flash.');
  assert.equal(faqHit(w.faq, 'is it for sale'), null, 'an unrelated question is not stretched to fit');
});

test('tell me more is the background; the credit line and accession come from the record', () => {
  assert.match(ask('tell me more').say, /bus ticket/);
  assert.equal(ask('where did it come from?').say, 'The gallery\'s credit line: Gift of the artist, 2020. Accession number LG.2020.1.');
});

test('Amazon Nova is given the background and the curator’s answers too', () => {
  const f = factsFor(g, w, 'English');
  assert.match(f, /Background, from the gallery: .*bus ticket/);
  assert.match(f, /Q \(the gallery's own\): Why is the sun so large\?\nA: The artist painted it/);
  assert.match(f, /Background on the gallery: Lagoon Gallery opened in 2019/);
  assert.match(f, /Credit line: Gift of the artist, 2020/);
});
