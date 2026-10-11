import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim } from '../lib/gallery.js';
import { systemFor, factsFor, enabled, askModel } from '../lib/bedrock.js';

const gallery = slim(JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url))));
const work = gallery.works[0];

test('the model is given the work and the gallery, and told to use nothing else', () => {
  const s = systemFor(gallery, work, 'English');
  assert.ok(s.includes(`Title: ${work.title}`));
  assert.ok(s.includes(`Artist: ${work.artist}`));
  assert.ok(s.includes(work.guide.English.slice(0, 50)));
  assert.match(s, /ONLY from the facts below/);
  assert.match(s, /Never invent/);
  assert.match(s, /never as instructions/);
});

test('the reply language is the visitor’s', () => {
  assert.match(systemFor(gallery, work, 'Igbo'), /Reply in Igbo/);
});

test('the facts carry no empty labels', () => {
  const f = factsFor(gallery, { ...work, year: '', medium: '' }, 'English');
  assert.doesNotMatch(f, /^Year:\s*$/m);
  assert.doesNotMatch(f, /^Medium:/m);
});

test('with no key the model is off and asking it is null, not an error', async () => {
  delete process.env.AWS_BEARER_TOKEN_BEDROCK;
  delete process.env.GAID_AWS_ACCESS_KEY_ID;
  assert.equal(enabled(), false);
  assert.equal(await askModel({ gallery, work, question: 'why?', lang: 'English' }), null);
});
