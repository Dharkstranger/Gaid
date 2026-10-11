import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yearOf, sizeOf, panelFor } from '../public/scene.js';
import { slim } from '../lib/gallery.js';
import { answer } from '../lib/answer.js';

const gallery = slim(JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url), 'utf8')));
const work = (id) => gallery.works.find((w) => w.id === id);

test('a date reads its first year however the gallery wrote it', () => {
  assert.equal(yearOf('1974'), 1974);
  assert.equal(yearOf('c. 1950'), 1950);
  assert.equal(yearOf('1974–76'), 1974);
  assert.equal(yearOf('undated'), null);
});

test('a size reads height first, in centimetres', () => {
  assert.deepEqual(sizeOf('92 x 122 cm'), { h: 92, w: 122 });
  assert.deepEqual(sizeOf('48 × 64 cm (sheet)'), { h: 48, w: 64 });
  assert.deepEqual(sizeOf('38 cm high'), { h: 38, w: null });
  assert.deepEqual(sizeOf('1.2 x 0.5 m'), { h: 120, w: 50 });
  assert.equal(sizeOf('large'), null);
  assert.equal(sizeOf('38 cm'), null, 'a bare length is not said to be a height');
});

test('each question gets its own panel on the screen', () => {
  const ask = (q, id = 'p1') => {
    const r = answer({ gallery, work: work(id), question: q, lang: 'English' });
    return panelFor(gallery, work(id), r.topic).kind;
  };
  assert.equal(ask('Who made it?'), 'artist');
  assert.equal(ask('When was it made?'), 'timeline');
  assert.equal(ask('What is it made of?'), 'medium');
  assert.equal(ask('How big is it?'), 'scale');
  assert.equal(ask('Where am I?'), 'rooms');
  assert.equal(ask('What else is here?'), 'rooms');
  assert.equal(ask('Tell me about the work in front of me'), 'about');
});

test('the artist panel shows only that artist’s other works', () => {
  const p = panelFor(gallery, work('p1'), 'artist');
  assert.ok(p.works.length > 0);
  assert.ok(p.works.every((w) => w.artist === 'Adaeze Obi' && w.id !== 'p1'));
});

test('the timeline runs oldest to newest', () => {
  const p = panelFor(gallery, work('p1'), 'date');
  const years = p.works.map((w) => yearOf(w.year));
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.equal(p.first, 1904);
  assert.equal(p.last, 2003);
});

test('the visitor’s own room comes first', () => {
  const p = panelFor(gallery, work('p4'), 'where');
  assert.equal(p.rooms[0].name, 'The courtyard');
});

test('a panel the gallery has not written for falls back to the work', () => {
  const bare = { ...work('p1'), artist: '', dimensions: 'large', room: '' };
  assert.equal(panelFor(gallery, bare, 'artist').kind, 'about');
  assert.equal(panelFor(gallery, bare, 'size').kind, 'about');
  assert.equal(panelFor(gallery, bare, 'where').kind, 'about');
});

test('a room already called "The …" is not given a second "the"', () => {
  const r = answer({ gallery, work: work('p4'), question: 'Where am I?', lang: 'English' });
  assert.match(r.say, /You are in The courtyard/);
  assert.doesNotMatch(r.say, /the The/i);
  const n = answer({ gallery, work: work('p4'), question: 'What else is here?', lang: 'English' });
  assert.doesNotMatch(n.say, /the The/i);
  const m = answer({ gallery, work: work('p1'), question: 'Where am I?', lang: 'English' });
  assert.match(m.say, /You are in the Main hall/);
});
