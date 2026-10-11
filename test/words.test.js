import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { W, spoken } from '../public/words.js';
import { wakeless } from '../lib/answer.js';

const count = (s) => s.replace(/·/g, ' ').trim().split(/\s+/).length;
// Two lines are allowed to be a line rather than a label: the legal foot of each screen.
const LINES = new Set(['foot', 'tvFoot']);

test('every label is one or two words, a phrase at most', () => {
  for (const [k, v] of Object.entries(W)) {
    if (typeof v !== 'string' || LINES.has(k)) continue;
    assert.ok(count(v) <= 3, `${k}: "${v}" is ${count(v)} words`);
  }
  for (const [label] of W.chips) assert.equal(count(label), 1, `chip "${label}"`);
  for (const k of ['moreBy', 'moreIn', 'at']) assert.ok(count(W[k]('X')) <= 3, k);
});

test('no sentence of GAID’s own is hidden in a page', () => {
  const pub = new URL('../public/', import.meta.url);
  for (const f of readdirSync(pub).filter((x) => /^(app|screen)\.js$/.test(x))) {
    const src = readFileSync(new URL(f, pub), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const strings = [...src.matchAll(/(['`])((?:(?!\1).)*[a-z]{2,}(?: [a-z]+){3,}(?:(?!\1).)*)\1/gi)].map((m) => m[2]);
    assert.deepEqual(strings, [], `${f} has words that belong in words.js`);
  }
});

test('nothing in a page hides the words under another W', () => {
  for (const f of ['app.js', 'screen.js']) {
    const src = readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b(const|let|var)\s+W\b|\(\s*W\s*[,)=]/, `${f} declares its own W`);
  }
});

test('the name is spelled GAID and said "guide"', () => {
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
  assert.match(src, /GAID \(said \\?"guide\\?"\)/);
  assert.match(src, /Never say your own name/);
});
