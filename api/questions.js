/* POST /api/questions — { slug, key? } -> { ok, questions: [{ workId, title, question, times, lastAsked }] }
   The curator's list: what visitors asked that the gallery has not answered.
   The key travels in the body, never the address, so it never lands in a log
   or a browser's history. A wrong key and an unknown gallery answer the same. */
import { readQuestions } from '../lib/store.js';
import { loadGallery, SLUG } from '../lib/gallery.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: 'body' }, 400); }
  const slug = String(body?.slug ?? '');
  if (!SLUG.test(slug)) return json({ ok: false, why: 'bad-slug' }, 400);
  const key = typeof body?.key === 'string' && body.key ? body.key.slice(0, 200) : null;
  const [rows, gallery] = await Promise.all([readQuestions(slug, key), loadGallery(slug)]);
  if (!rows) return json({ ok: false, why: 'unavailable' });
  const title = (id) => gallery?.works.find((w) => w.id === id)?.title ?? '';
  return json({ ok: true, gallery: gallery?.name ?? slug, questions: rows.map((r) => ({ ...r, title: title(r.workId) })) });
}
