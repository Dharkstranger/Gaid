/* A one-purpose pass for a browser to send recordings straight to the voice
   engine, so the browser never holds GAID_VOICE_TOKEN. Half an hour long.
   The engine checks it with voice/store.py ticket_ok(); the two must agree
   byte for byte, and test/ownvoice.test.js has Python check one Node made. */
import { createHmac, randomBytes } from 'node:crypto';

const b64 = (b) => Buffer.from(b).toString('base64url');
export const TTL_S = 30 * 60;

export function ticket(token, kind = 'enrol', now = Date.now()) {
  const body = b64(JSON.stringify({ k: kind, e: Math.floor(now / 1000) + TTL_S, n: randomBytes(8).toString('hex') }));
  const mac = b64(createHmac('sha256', token).update(`gaid.voice.v1:${body}`).digest());
  return `${body}.${mac}`;
}
