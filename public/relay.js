/* The phone and the screen beside the work, on different devices.

   Supabase Realtime broadcast: a channel per gallery and pairing code, that
   nothing is written to. Spoken the way @supabase/realtime-js speaks it
   (protocol 1.0.0, JSON frames, a heartbeat every 25 s), in eighty lines,
   because the page's policy runs only GAID's own scripts.

   Nothing in here may get in the way: no network, a refused socket, a
   closed tab — the phone carries on, the screen keeps what it had, and a
   window on the same machine still hears it through BroadcastChannel. */
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const HEARTBEAT_MS = 25_000;
const ALPHABET = 'ACDEFHJKMNPRTUVWXY3479';          // no 0/O, 1/I/L, 2/Z, 5/S, 8/B: read off a TV across a room

export const CODE = /^[ACDEFHJKMNPRTUVWXY3479]{4}$/;

/** A fresh four-character pairing code. */
export function newCode(rand = Math.random) {
  return Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
}

export const topicFor = (slug, code) => `gaid-${slug}-${code}`;

/**
 * Join a channel. onMessage(payload) for every broadcast another device sends.
 * Returns { send(payload), close() }. Never throws.
 */
export function openRelay({ topic, onMessage, WS = globalThis.WebSocket, url = SUPABASE_URL, key = SUPABASE_KEY }) {
  let ws = null; let ref = 0; let joinRef = null; let asked = null; let beat = null; let closed = false; let wait = 1000;
  const queue = [];
  const full = `realtime:${topic}`;
  const push = (msg) => { try { ws?.send(JSON.stringify(msg)); } catch { /* not up */ } };
  const joined = () => ws?.readyState === 1 && joinRef !== null;

  function connect() {
    if (closed || !WS) return;
    try {
      ws = new WS(`${url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`);
    } catch { return retry(); }
    ws.onopen = () => {
      wait = 1000;
      ref += 1; joinRef = null;
      const r = String(ref);
      asked = r;
      push({ topic: full, event: 'phx_join', ref: r, join_ref: r, payload: {
        config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [], private: false },
      } });
      clearInterval(beat);
      beat = setInterval(() => { ref += 1; push({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(ref) }); }, HEARTBEAT_MS);
    };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m?.topic !== full) return;
      // The real service answers a join with its ref and NO join_ref (seen
      // live, 14 October): match on the ref we sent. Waiting for join_ref
      // held every message back, and nothing ever reached a TV.
      if (m.event === 'phx_reply' && m.payload?.status === 'ok' && joinRef === null && m.ref === asked) {
        joinRef = asked;
        while (queue.length) send(queue.shift());
        return;
      }
      if (m.event === 'broadcast' && m.payload?.type === 'broadcast' && m.payload.event === 'gaid') {
        try { onMessage?.(m.payload.payload); } catch { /* the page's problem, not the link's */ }
      }
    };
    ws.onclose = () => { clearInterval(beat); joinRef = null; retry(); };
    ws.onerror = () => { try { ws.close(); } catch { /* already */ } };
  }

  function retry() {
    if (closed) return;
    setTimeout(connect, wait);
    wait = Math.min(wait * 2, 30_000);
  }

  function send(payload) {
    if (!joined()) { queue.push(payload); if (queue.length > 5) queue.shift(); return; }
    ref += 1;
    push({ topic: full, event: 'broadcast', ref: String(ref), join_ref: joinRef, payload: { type: 'broadcast', event: 'gaid', payload } });
  }

  connect();
  return { send, close() { closed = true; clearInterval(beat); try { ws?.close(); } catch { /* already */ } } };
}
