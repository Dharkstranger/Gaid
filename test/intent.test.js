import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intentOf } from '../public/intent.js';
import { W } from '../public/words.js';

const of = (s) => intentOf(s).intent;

test('about the work on screen is never a search', () => {
  assert.equal(of(W.chips[0][1]), 'here', 'the tap on a picture asks this');
  assert.equal(of('Alexa, tell me about the work in front of me'), 'here');
  assert.equal(of('who made it'), 'here');
});

test('the visit, an enquiry, a search, anything else', () => {
  assert.equal(of('Alexa, what did I see today?'), 'visit');
  assert.equal(of('Alexa, ask GAID about Lagoon, Mask, Crossing'), 'visit');
  assert.equal(of('I want to buy it'), 'enquire');
  assert.equal(of('the painting with the sun'), 'find');
  assert.equal(of('why the red?'), 'ask');
});

test('the wake word goes, "guide me" stays', () => {
  assert.equal(intentOf('Guide, why the red?').q, 'why the red?');
  assert.equal(intentOf('guide me to the mask').q, 'guide me to the mask');
});
