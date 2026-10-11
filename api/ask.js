/* POST /api/ask — { slug, workId, question, lang, history } -> { ok, say, action, topic, source }
   The phone page's door to lib/guide.js, the same brain Alexa+ reaches
   through /api/mcp. */
import { ask } from '../lib/guide.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export function caller(request) {
  const h = request.headers;
  const hops = (h.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // The LAST hop is the one our own edge added; the first is the caller's own writing.
  return h.get('x-real-ip') || hops[hops.length - 1] || 'unknown';
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  const out = await ask({ ...body, slug: body?.slug ?? 'sample', caller: caller(request) });
  if (!out.ok) return json(out, out.why === 'not-found' ? 404 : 400);
  return json({ ok: true, say: out.say, action: out.action, topic: out.topic, source: out.source });
}
