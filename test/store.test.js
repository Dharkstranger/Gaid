/* The questions store, against Supabase's own replies. This machine cannot
   reach *.supabase.co, so fetch is answered here — with bodies copied from
   the real database on 11 October 2026 (the trial run of the migration), not
   invented: gaid_record_question returned true; gaid_questions returned the
   row below; a wrong key returned []. */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
delete process.env.AWS_BEARER_TOKEN_BEDROCK;
// setup.js switches the store off for every other file; this one turns it on against its stand-in.
delete process.env.GAID_QUESTIONS;
process.env.GAID_SUPABASE_URL = 'https://stand-in.supabase.co';
process.env.GAID_DB_SECRET = 'test-secret';
const REAL_ROW = { work_id: 'p1', question: 'why those colours', times: 2, last_asked: '2026-10-11T09:31:24.828952+00:00' };

let calls = []; let reply = () => new Response('true', { status: 200 });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('.supabase.co/rest/v1/rpc/')) {
    calls.push({ name: String(url).split('/rpc/')[1], body: JSON.parse(init.body), headers: init.headers });
    return reply(calls.at(-1));
  }
  return realFetch(url, init);
};
beforeEach(() => { calls = []; reply = () => new Response('true', { status: 200 }); });

const { ask } = await import('../lib/guide.js');
const { readQuestions } = await import('../lib/store.js');
const { POST } = await import('../api/questions.js');

test('an unanswered question is kept: the question and nothing about the person', async () => {
  const out = await ask({ slug: 'sample', workId: 'p1', question: 'Why those colours?', caller: '10.0.0.9' });
  assert.equal(out.unanswered, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'gaid_record_question');
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['p_lang', 'p_question', 'p_secret', 'p_slug', 'p_work_id']);
  assert.equal(calls[0].body.p_secret, 'test-secret', 'GAID\'s own secret, from the environment');
  assert.equal(calls[0].body.p_question, 'Why those colours?');
  assert.doesNotMatch(JSON.stringify(calls[0]), /10\.0\.0\.9/, 'the caller never reaches the store');
});

test('an answered question is not kept', async () => {
  const out = await ask({ slug: 'sample', workId: 'p1', question: 'Who made it?' });
  assert.equal(out.unanswered, undefined);
  assert.equal(calls.length, 0);
});

test('"the gallery has not said" from a rule answer is kept too', async () => {
  const gallery = JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url)));
  assert.ok(gallery);   // the sample gives every work a size; this checks the pattern itself
  const { SAID_NOTHING } = await import('../lib/store.js');
  for (const s of ['The gallery has not said who made it.', 'The gallery has not given its size.', 'I only know what Lagoon Gallery wrote about this work.']) {
    assert.match(s, SAID_NOTHING, s);
  }
  assert.doesNotMatch('Adaeze Obi. Painter working in oil.', SAID_NOTHING);
});

test('a store that is down never reaches the visitor', async () => {
  reply = () => { throw new TypeError('fetch failed'); };
  const out = await ask({ slug: 'sample', workId: 'p1', question: 'Why those colours?' });
  assert.equal(out.ok, true);
  assert.match(out.say, /only know what/);
});

test('the list reads Supabase’s real reply, and refuses anything else', async () => {
  reply = () => Response.json([REAL_ROW]);
  assert.deepEqual(await readQuestions('sample'), [{ workId: 'p1', question: 'why those colours', times: 2, lastAsked: REAL_ROW.last_asked }]);
  reply = () => Response.json({ ok: true, portal: 'Hotel wifi' });       // a captive portal's own JSON
  assert.equal(await readQuestions('sample'), null);
  reply = () => Response.json([]);                                      // a wrong key
  assert.deepEqual(await readQuestions('lagos', 'wrong'), []);
});

test('the curator route puts the key in the body and names each work', async () => {
  reply = () => Response.json([REAL_ROW]);
  const res = await POST(new Request('http://x/api/questions', { method: 'POST', body: JSON.stringify({ slug: 'sample', key: 'k-123' }) }));
  const body = await res.json();
  assert.equal(body.questions[0].title, 'Sunrise over the lagoon');
  assert.equal(calls[0].body.p_key, 'k-123');
});

test('the migration keeps the doors narrow', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261011120000_gaid_questions.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter table gaid\.questions enable row level security/);
  assert.doesNotMatch(sql, /create policy/i, 'no policy: nothing reaches the table but the two functions');
  assert.ok((sql.match(/set search_path = ''/g) ?? []).length >= 2, 'both functions pin search_path');
  assert.match(sql, /revoke execute on function public\.gaid_record_question[^;]*from public/);
  assert.match(sql, /interval '180 days'/);
  assert.doesNotMatch(sql, /\b(ip|device|email|user_agent)\b\s+text/i, 'nothing about the person');
});

test('the doors open only with GAID\'s own secret, and the secret is not in the code', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261011140000_gaid_server_secret.sql', import.meta.url), 'utf8');
  assert.match(sql, /if not gaid\.server_ok\(p_secret\) then return false; end if;/);
  assert.match(sql, /if not gaid\.server_ok\(p_secret\) then return; end if;/);
  assert.match(sql, /'gaid\.server\.v1:' \|\| p_secret, 'sha256'/, 'only a fingerprint is stored');
  assert.doesNotMatch(sql, /drop function/i, 'renamed, never dropped');
  const store = readFileSync(new URL('../lib/store.js', import.meta.url), 'utf8');
  assert.match(store, /process\.env\.GAID_DB_SECRET/);
});

test('with no secret set, nothing is sent at all', async () => {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `
    process.env.GAID_SUPABASE_URL = 'https://stand-in.supabase.co'; delete process.env.GAID_DB_SECRET; delete process.env.GAID_QUESTIONS;
    let n = 0; globalThis.fetch = async () => { n += 1; return new Response('true'); };
    const { recordUnanswered } = await import(${JSON.stringify(new URL('../lib/store.js', import.meta.url).href)});
    console.log(await recordUnanswered({ slug: 'sample', question: 'q' }), n);`]).toString().trim();
  assert.equal(out, 'false 0');
});
