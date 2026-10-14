/* Does the phone-to-TV link work against the real Supabase Realtime?
   Diagnostic: one raw socket, every frame printed (the key is not printed). */
import { SUPABASE_URL, SUPABASE_KEY } from '../public/config.js';

const url = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
const topic = 'realtime:gaid-openaccess-TEST';
const ws = new WebSocket(url);
const log = (dir, d) => console.log(dir, String(d).slice(0, 600));
ws.onopen = () => {
  log('open', '');
  const join = { topic, event: 'phx_join', ref: '1', join_ref: '1', payload: { config: { broadcast: { ack: true, self: true }, presence: { enabled: false }, postgres_changes: [], private: false } } };
  ws.send(JSON.stringify(join)); log('>>', JSON.stringify(join));
  setTimeout(() => { const b = { topic, event: 'broadcast', ref: '2', join_ref: '1', payload: { type: 'broadcast', event: 'gaid', payload: { type: 'ping' } } }; ws.send(JSON.stringify(b)); log('>>', JSON.stringify(b)); }, 2500);
};
ws.onmessage = (e) => log('<<', e.data);
ws.onerror = (e) => log('error', e?.message ?? e?.type);
ws.onclose = (e) => log('close', `${e.code} ${e.reason}`);
setTimeout(() => { ws.close(); process.exit(0); }, 9000);
