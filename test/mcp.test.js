/* The MCP server driven the way Alexa+ would drive it: a real MCP client,
   over real HTTP, through the same api/mcp.js Vercel runs. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

process.env.GALLERIS_LOCAL_DIR = new URL('../fixtures', import.meta.url).pathname;
delete process.env.AWS_BEARER_TOKEN_BEDROCK;
process.env.GAID_QUESTIONS = 'off';   // test/store.test.js covers the store, against Supabase's own replies
const { start } = await import('../dev.mjs');

let server; let base; let client;
before(async () => {
  server = await start(0);
  base = `http://localhost:${server.address().port}`;
  client = new Client({ name: 'alexa-plus-simulator', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('/api/mcp', base)));
});
after(async () => { await client?.close(); server?.close(); });

const call = async (name, args) => (await client.callTool({ name, arguments: args })).structuredContent;

test('it speaks protocol 2025-11-25 and names itself', async () => {
  const res = await fetch(`${base}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '1' } } }),
  });
  const body = await res.json();
  assert.equal(body.result.protocolVersion, '2025-11-25');
  assert.equal(body.result.serverInfo.name, 'gaid');
  assert.match(body.result.instructions, /said "guide"/);
});

test('it offers the eight tools, none of which changes anything', async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['ask_work', 'find_work', 'look_closer', 'recall_visit', 'send_enquiry', 'visitor_questions', 'whats_nearby', 'where_next']);
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
});

test('ask_work answers from the gallery and names the screen panel', async () => {
  const r = await call('ask_work', { gallery: 'sample', work_id: 'p1', question: 'Who made it?' });
  assert.match(r.say, /^Adaeze Obi\./);
  assert.equal(r.source, 'gallery');
  assert.equal(r.panel, 'artist');
  assert.equal(r.work.title, 'Sunrise over the lagoon');
});

test('ask_work says the gallery has not said, rather than inventing', async () => {
  const r = await call('ask_work', { gallery: 'sample', work_id: 'p1', question: 'Why did she choose those colours?' });
  assert.equal(r.unanswered, true);
  assert.match(r.say, /only know what Lagoon Gallery wrote/);
});

test('find_work finds "the one with the sun"', async () => {
  const r = await call('find_work', { gallery: 'sample', description: 'the painting with the sun' });
  assert.equal(r.works[0].title, 'Sunrise over the lagoon');
});

test('recall_visit reads a visit back out of its own code', async () => {
  const r = await call('recall_visit', { visit: 'sample~p1.p4.p9' });
  assert.equal(r.say, 'At Lagoon Gallery you saw Sunrise over the lagoon, Ceremonial mask and Crossing.');
  assert.deepEqual(r.works.map((w) => w.id), ['p1', 'p4', 'p9']);
  assert.equal((await call('recall_visit', { visit: 'not a code' })).found, false);
});

test('recall_visit takes the three words a visitor was given', async () => {
  const r = await call('recall_visit', { gallery: 'sample', words: 'Lagoon, mask and Crossing' });
  assert.deepEqual(r.works.map((w) => w.id), ['p1', 'p4', 'p9']);
  assert.equal(r.say, 'At Lagoon Gallery you saw Sunrise over the lagoon, Ceremonial mask and Crossing.');
  assert.equal((await call('recall_visit', { words: 'Lagoon' })).found, false, 'words need a gallery');
});

test('where_next names one work and a reason the file backs up', async () => {
  const r = await call('where_next', { gallery: 'sample', work_id: 'p4', seen: [] });
  assert.equal(r.say, 'Next: Standing figure, also by Chinedu Mbah.');
  assert.equal(r.why, 'artist');
  const after = await call('where_next', { gallery: 'sample', work_id: 'p4', seen: ['p8', 'p9'] });
  assert.notEqual(after.next.id, 'p8', 'skips what was seen');
});

test('look_closer walks the gallery\'s words with a box for each', async () => {
  const r = await call('look_closer', { gallery: 'sample', work_id: 'p9' });
  assert.equal(r.steps[0].say, 'Crossing, by Chinedu Mbah.');
  assert.equal(r.steps[2].say, 'The centre disc turns in high wind.');
  assert.deepEqual(r.steps[2].box, { x: 0.35, y: 0.35, w: 0.3, h: 0.3 });
  for (const s of r.steps) assert.ok(s.box.x + s.box.w <= 1 && s.box.y + s.box.h <= 1);
});

test('send_enquiry prepares a message and sends nothing', async () => {
  const r = await call('send_enquiry', { gallery: 'sample', work_id: 'p1', name: 'Ada' });
  assert.equal(r.channel, 'email');
  assert.match(r.href, /^mailto:hello@example\.org\?/);
  assert.match(r.text, /Sunrise over the lagoon by Adaeze Obi \(1974\)/);
  assert.doesNotMatch(r.text + r.say, /₦|\$|price/i);
});

test('an unknown gallery is a sentence, never an error', async () => {
  const r = await call('ask_work', { gallery: 'no-such-place', question: 'hello' });
  assert.equal(r.found, false);
});

test('GET and DELETE are refused: there is no session to stream or end', async () => {
  assert.equal((await fetch(`${base}/api/mcp`)).status, 405);
  assert.equal((await fetch(`${base}/api/mcp`, { method: 'DELETE' })).status, 405);
});
