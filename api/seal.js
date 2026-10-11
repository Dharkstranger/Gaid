/* POST /api/seal — { seal } -> { ok, answer: { slug, workId, topic, say } }
   The TV beside the work asks here before it shows anything it was sent. */
import { unseal } from '../lib/seal.js';
import { allow } from '../lib/limit.js';
import { caller } from './ask.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export async function POST(request) {
  if (!allow(caller(request), Date.now(), 240, 'seal')) return json({ ok: false, why: 'slow-down' }, 429);
  let body; try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  const answer = unseal(body?.seal);
  return answer ? json({ ok: true, answer }) : json({ ok: false, why: 'not-ours' }, 403);
}
