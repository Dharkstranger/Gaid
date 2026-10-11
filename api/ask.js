/* POST /api/ask — { slug, workId, question, lang, history } -> { ok, say, action, source }
   The gallery's own words answer first (answer.js). Only a question they do
   not cover goes to Amazon Nova (bedrock.js), and if that fails too the
   visitor hears what the guide can do instead — never an error. */
import { loadGallery, SLUG } from '../lib/gallery.js';
import { answer, noModelReply } from '../lib/answer.js';
import { askModel, enabled } from '../lib/bedrock.js';
import { allow } from '../lib/limit.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

function caller(request) {
  const h = request.headers;
  const hops = (h.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // The LAST hop is the one our own edge added; the first is the caller's own writing.
  return h.get('x-real-ip') || hops[hops.length - 1] || 'unknown';
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  const slug = String(body?.slug ?? 'sample');
  const question = String(body?.question ?? '').slice(0, 300);
  if (!SLUG.test(slug)) return json({ ok: false, why: 'bad-slug' }, 400);

  const gallery = await loadGallery(slug);
  if (!gallery) return json({ ok: false, why: 'not-found' }, 404);
  const work = gallery.works.find((w) => w.id === String(body?.workId ?? '')) ?? gallery.works[0] ?? null;
  const lang = gallery.languages.includes(body?.lang) ? body.lang : gallery.languages[0];

  const ruled = answer({ gallery, work, question, lang });
  if (ruled.matched) return json({ ok: true, say: ruled.say, action: ruled.action, source: 'gallery' });

  if (enabled() && work && allow(caller(request))) {
    const said = await askModel({ gallery, work, question, lang, history: body?.history });
    if (said) return json({ ok: true, say: said, action: null, source: 'nova' });
  }
  return json({ ok: true, say: noModelReply(gallery), action: null, source: 'gallery' });
}
