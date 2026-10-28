/* POST /api/voice-withdraw — { invite, voiceId } -> { ok, deleted }.
   Deletes everything GAID's voice engine holds for a voice: the copy, the
   reference, the held-back recordings and the consent sentence. The gallery
   also marks the voice withdrawn in what it publishes, which stops GAID using
   it within a minute (lib/voices.js). */
import { timingSafeEqual, createHash } from 'node:crypto';
import { enabled } from '../lib/ownvoice.js';
import { allow } from '../lib/limit.js';
import { caller } from './ask.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const same = (a, b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());

export async function POST(request) {
  if (!allow(caller(request), Date.now(), 10, 'voice-withdraw')) return json({ ok: false, why: 'slow-down' }, 429);
  if (!enabled() || !process.env.GAID_VOICE_INVITE) return json({ ok: false, why: 'off' }, 503);
  let body; try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  if (typeof body?.invite !== 'string' || !same(body.invite.trim(), process.env.GAID_VOICE_INVITE)) return json({ ok: false, why: 'invite' }, 403);
  if (!/^gv[0-9a-f]{16}$/.test(String(body?.voiceId ?? ''))) return json({ ok: false, why: 'voice-id' }, 400);
  try {
    const res = await fetch(`${process.env.GAID_VOICE_URL.replace(/\/$/, '')}/withdraw`, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { authorization: `Bearer ${process.env.GAID_VOICE_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ voiceId: body.voiceId }),
    });
    const out = await res.json();
    return json({ ok: out?.ok === true, deleted: out?.deleted === true });
  } catch {
    return json({ ok: false, why: 'network' }, 502);
  }
}
