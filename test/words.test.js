import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { W, spoken } from '../public/words.js';
import { wakeless } from '../lib/answer.js';

const count = (s) => s.replace(/·/g, ' ').trim().split(/\s+/).length;
// Two lines are allowed to be a line rather than a label: the legal foot of each screen.
const LINES = new Set(['foot']);

test('every label is one or two words, a phrase at most', () => {
  for (const [k, v] of Object.entries(W)) {
    if (typeof v !== 'string' || LINES.has(k)) continue;
    assert.ok(count(v) <= 3, `${k}: "${v}" is ${count(v)} words`);
  }
  for (const [label] of W.chips) assert.equal(count(label), 1, `chip "${label}"`);
  for (const [, label] of W.aboutIcons) assert.ok(count(label) <= 3, label);
  for (const f of W.aboutFacts) assert.ok(count(f) <= 9, f);
  for (const k of ['at', 'goTo', 'sendOn']) assert.ok(count(W[k]('X')) <= 3, k);
});

test('no sentence of GAID’s own is hidden in a page', () => {
  const pub = new URL('../public/', import.meta.url);
  for (const f of readdirSync(pub).filter((x) => /^(app|screen|home|curator|voice-page)\.js$/.test(x))) {
    const src = readFileSync(new URL(f, pub), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const strings = [...src.matchAll(/(['`])((?:(?!\1)[^(){};=\n])*[a-z]{2,}(?: [a-z]+){3,}(?:(?!\1)[^(){};=\n])*)\1/gi)].map((m) => m[2]);
    assert.deepEqual(strings, [], `${f} has words that belong in words.js`);
  }
});

test('nothing in a page hides the words under another W', () => {
  for (const f of ['app.js', 'screen.js', 'home.js', 'curator.js', 'voice-page.js']) {
    const src = readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b(const|let|var)\s+W\b|\(\s*W\s*[,)=]/, `${f} declares its own W`);
  }
});

test('the name is spelled GAID and pronounced "guide"', () => {
  assert.equal(W.name, 'GAID');
  assert.equal(spoken('Ask GAID about it'), 'Ask Guide about it');
  assert.equal(spoken('gaid'), 'Guide');
  assert.equal(spoken('Ask the gallery'), 'Ask the gallery', 'only the whole word');
});

test('"Guide," is a wake word, as "Alexa," is; "guide me" is a question', () => {
  assert.equal(wakeless('Guide, who made it?'), 'who made it');
  assert.equal(wakeless('guide who made it'), 'who made it');
  assert.equal(wakeless('Hey GAID, when was it made?'), 'when was it made');
  assert.equal(wakeless('Alexa, tell me about it'), 'tell me about it');
  assert.equal(wakeless('guide me to Eclipse'), 'guide me to eclipse');
});

test('Amazon Nova is told how its name is said, and not to say it', async () => {
  const src = readFileSync(new URL('../lib/bedrock.js', import.meta.url), 'utf8');
  assert.match(src, /GAID \(pronounced \\?"guide\\?"\)/);
  assert.match(src, /Never say your own name/);
});

test('every word in words.js is used somewhere, and nothing is left behind', () => {
  const pub = new URL('../public/', import.meta.url);
  const lib = new URL('../lib/', import.meta.url);
  const src = [
    ...readdirSync(pub).filter((f) => /\.(js|html)$/.test(f) && f !== 'words.js').map((f) => readFileSync(new URL(f, pub), 'utf8')),
    ...readdirSync(lib).map((f) => readFileSync(new URL(f, lib), 'utf8')),
  ].join('\n');
  const DYNAMIC = new Set(['name', 'said', 'listening', 'speaking', 'thinking']);   // looked up by state, or the name rule itself
  const unused = Object.keys(W).filter((k) => !DYNAMIC.has(k) && !new RegExp(`W\\.${k}\\b|data-(w|aria)="${k}"`).test(src));
  assert.deepEqual(unused, []);
  const say = Object.keys(W.say).filter((k) => !new RegExp(`W\\.say\\.${k}\\b`).test(src));
  assert.deepEqual(say, []);
});
