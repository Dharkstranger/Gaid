/* POST /api/voice-ticket — { invite } -> { ok, url, ticket }.

   Who may make a voice: somebody holding the invitation the owner gives out
   (GAID_VOICE_INVITE), until Galleris's own sign-in carries it. The pass
   lets their browser send recordings straight to the engine for half an
   hour, and does nothing else. */
import { timingSafeEqual, createHash } from 'node:crypto';
import { ticket } from '../lib/voiceticket.js';
import { enabled } from '../lib/ownvoice.js';
import { allow } from '../lib/limit.js';
import { caller } from './ask.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const same = (a, b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());

export async function POST(request) {
  if (!allow(caller(request), Date.now(), 10, 'voice-ticket')) return json({ ok: false, why: 'slow-down' }, 429);
  if (!enabled() || !process.env.GAID_VOICE_INVITE) return json({ ok: false, why: 'off' }, 503);
  let body; try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  if (typeof body?.invite !== 'string' || !same(body.invite.trim(), process.env.GAID_VOICE_INVITE)) return json({ ok: false, why: 'invite' }, 403);
  return json({ ok: true, url: `${process.env.GAID_VOICE_URL.replace(/\/$/, '')}/enrol`, ticket: ticket(process.env.GAID_VOICE_TOKEN) });
}
