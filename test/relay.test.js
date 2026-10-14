/* The live link, against a fake socket that answers the way Supabase
   Realtime does (phx_reply ok to a join; broadcasts as JSON frames). The
   shapes are @supabase/realtime-js's own (RealtimeChannel.subscribe and
   RealtimeClient, read 11 October 2026). This machine cannot reach
   *.supabase.co, so the real round trip is checked on the live site. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openRelay, newCode, CODE, topicFor } from '../public/relay.js';

function fakeSocket() {
  const sockets = [];
  class WS {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
    send(s) { this.sent.push(JSON.parse(s)); }
    close() { this.readyState = 3; this.onclose?.(); }
    hear(m) { this.onmessage?.({ data: JSON.stringify(m) }); }
  }
  return { WS, sockets };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('a pairing code is four characters nobody misreads across a room', () => {
  for (let i = 0; i < 200; i += 1) assert.match(newCode(), CODE);
  assert.doesNotMatch('O0I1', CODE);
  assert.equal(topicFor('sample', 'K7QX'), 'gaid-sample-K7QX');
});

test('it joins the way Supabase’s own client joins, with the publishable key', async () => {
  const { WS, sockets } = fakeSocket();
  const r = openRelay({ topic: 'gaid-sample-K7QX', WS, url: 'https://ref.supabase.co', key: 'sb_publishable_x' });
  await tick();
  const [ws] = sockets;
  assert.equal(ws.url, 'wss://ref.supabase.co/realtime/v1/websocket?apikey=sb_publishable_x&vsn=1.0.0');
  const join = ws.sent[0];
  assert.equal(join.topic, 'realtime:gaid-sample-K7QX');
  assert.equal(join.event, 'phx_join');
  assert.deepEqual(join.payload.config, { broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [], private: false });
  r.close();
});

test('what is sent before the join is answered waits, then goes', async () => {
  const { WS, sockets } = fakeSocket();
  const r = openRelay({ topic: 't', WS, url: 'https://x.supabase.co', key: 'k' });
  r.send({ type: 'answer', topic: 'artist' });
  await tick();
  const [ws] = sockets;
  assert.equal(ws.sent.length, 1, 'only the join so far');
  // Exactly as the real service replied on 14 October: a ref, and no join_ref.
  ws.hear({ ref: ws.sent[0].ref, event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: [] } }, topic: 'realtime:t' });
  const b = ws.sent[1];
  assert.equal(b.event, 'broadcast');
  assert.deepEqual(b.payload, { type: 'broadcast', event: 'gaid', payload: { type: 'answer', topic: 'artist' } });
  r.close();
});

test('it hears broadcasts on its own channel only', async () => {
  const { WS, sockets } = fakeSocket();
  const got = [];
  const r = openRelay({ topic: 't', WS, url: 'https://x.supabase.co', key: 'k', onMessage: (m) => got.push(m) });
  await tick();
  const [ws] = sockets;
  ws.hear({ topic: 'realtime:t', event: 'broadcast', payload: { type: 'broadcast', event: 'gaid', payload: { n: 1 } } });
  ws.hear({ topic: 'realtime:other', event: 'broadcast', payload: { type: 'broadcast', event: 'gaid', payload: { n: 2 } } });
  ws.hear({ topic: 'realtime:t', event: 'broadcast', payload: { type: 'broadcast', event: 'not-ours', payload: { n: 3 } } });
  ws.onmessage?.({ data: 'not json' });
  assert.deepEqual(got, [{ n: 1 }]);
  r.close();
});

test('a dropped socket comes back by itself; a closed relay stays closed', async () => {
  const { WS, sockets } = fakeSocket();
  const r = openRelay({ topic: 't', WS, url: 'https://x.supabase.co', key: 'k' });
  await tick();
  sockets[0].close();
  await new Promise((res) => setTimeout(res, 1100));
  assert.equal(sockets.length, 2, 'reconnected after a second');
  r.close();
  await new Promise((res) => setTimeout(res, 1100));
  assert.equal(sockets.length, 2, 'no reconnect after close');
});

test('no WebSocket at all is not an error', () => {
  const r = openRelay({ topic: 't', WS: undefined });
  r.send({ a: 1 });
  r.close();
});
