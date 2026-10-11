/* GET /api/gallery?slug=<link name> — the gallery, slimmed to what a guide
   needs. Fetched here rather than in the browser because the published file
   is on another site, and so the browser and the guide read the same thing. */
import { loadGallery, SLUG } from '../lib/gallery.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
});

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get('slug') || 'sample';
  if (!SLUG.test(slug)) return json({ ok: false, why: 'bad-slug' }, 400);
  const gallery = await loadGallery(slug);
  if (!gallery) return json({ ok: false, why: 'not-found' }, 404);
  return json({ ok: true, gallery });
}
