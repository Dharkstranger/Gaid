/* POST /api/ask — { slug, workId | at, question, lang, history, offered }
     -> { ok, answer, sources, unknown, say, action, topic, source, enquire }
   The phone page's door to lib/guide.js, the same brain Alexa+ reaches
   through /api/mcp, and Galleris's Ask button (handover, section 5.1):
   `at` is the work, `answer` the words, `sources` where they came from,
   `unknown` true when the gallery has not said. `ok` is always a boolean.
   Galleris also sends `device`, a hashed id: GAID neither reads nor keeps it. */
import { ask } from '../lib/guide.js';
import { allow } from '../lib/limit.js';

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
  if (!allow(caller(request), Date.now(), 120, 'ask')) return json({ ok: false, why: 'slow-down' }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  const out = await ask({
    slug: body?.slug ?? 'sample', workId: body?.workId ?? body?.at, question: body?.question,
    lang: body?.lang, history: body?.history, offered: body?.offered === true, caller: caller(request),
  });
  if (!out.ok) return json({ ok: false, why: out.why }, out.why === 'not-found' ? 404 : 400);
  return json({
    ok: true,
    answer: out.say,
    sources: out.from && out.from !== 'none' && !out.unanswered ? [out.from] : [],
    unknown: Boolean(out.unanswered || out.closed),
    say: out.say, action: out.action, topic: out.topic, source: out.source,
    closed: Boolean(out.closed), seal: out.seal ?? null, enquire: out.enquire ?? null,
  });
}
