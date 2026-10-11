import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim } from '../lib/gallery.js';
import { answer, wakeless } from '../lib/answer.js';

const gallery = slim(JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url))));
const work = gallery.works[0];
const ask = (question, lang = 'English', w = work) => answer({ gallery, work: w, question, lang });

test('the wake word is not part of the question', () => {
  assert.equal(wakeless('Alexa, who made it?'), 'who made it');
  assert.equal(wakeless('hey alexa tell me about this'), 'tell me about this');
});

test('"the work in front of me" is the work on screen, from its own guide', () => {
  const r = ask('Alexa, tell me about the work in front of me');
  assert.equal(r.matched, true);
  assert.ok(r.say.startsWith(work.title), r.say);
  assert.ok(r.say.includes(work.guide.English.slice(0, 40)));
  assert.deepEqual(r.action, { type: 'play' });
});

test('who, when, what of and where come from the file', () => {
  assert.ok(ask('Who made it?').say.startsWith(work.artist));
  assert.ok(ask('When was it made?').say.includes(work.year));
  assert.ok(ask('What is it made of?').say.startsWith(work.medium));
  assert.ok(ask('Where am I?').say.includes(work.room));
});

test('a missing fact is said to be missing, never filled in', () => {
  const bare = { ...work, artist: '', year: '', medium: '', dimensions: '' };
  assert.match(ask('Who made it?', 'English', bare).say, /has not said/);
  assert.match(ask('When was it made?', 'English', bare).say, /has not given/);
  assert.match(ask('How big is it?', 'English', bare).say, /has not given/);
});

test('a language with no translation says so and falls back', () => {
  const r = ask('Say it in Yoruba');
  assert.equal(r.action.type, 'lang');
  assert.match(r.say, /not in Yoruba yet/);
});

test('a language with words uses them', () => {
  const w = { ...work, guide: { ...work.guide, Yoruba: 'Àwòrán yìí ...' } };
  const r = ask('Say it in Yoruba', 'English', w);
  assert.ok(r.say.includes('Àwòrán yìí'));
  assert.doesNotMatch(r.say, /not in Yoruba yet/);
});

test('take me to a title moves to that work', () => {
  const other = gallery.works[3];
  const r = ask(`Take me to ${other.title}`);
  assert.deepEqual(r.action, { type: 'goto', id: other.id });
});

test('what else lists other works, never the one on screen', () => {
  const r = ask('What else is here?');
  assert.ok(!r.say.includes(`: ${work.title}`));
  assert.ok(gallery.works.filter((w) => w.id !== work.id).some((w) => r.say.includes(w.title)));
});

test('anything else is left for the model', () => {
  assert.equal(ask('Why did she choose those colours?').matched, false);
});
