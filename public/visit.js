/* A visit, carried in its own code. No server keeps a list of who saw what:
   the phone writes the works it stood in front of into a short code, and at
   home Alexa+ reads them back out of it. Nothing about the visitor is in it.
   Shape: <gallery>~<id>.<id>.<id>   e.g. sample~p1.p4.p9
   Runs in the browser and in Node, so the phone and the MCP server agree. */

export const MAX_WORKS = 40;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/;

export function visitCode(slug, ids) {
  const seen = [...new Set(ids.map(String))].filter((id) => ID.test(id)).slice(-MAX_WORKS);
  return `${slug}~${seen.join('.')}`;
}

/** { slug, ids } or null. Never throws. */
export function readVisit(code) {
  const m = String(code ?? '').trim().match(/^([a-z0-9-]+)~([A-Za-z0-9_.-]*)$/);
  if (!m || !SLUG.test(m[1])) return null;
  const ids = m[2].split('.').filter((id) => ID.test(id)).slice(0, MAX_WORKS);
  return { slug: m[1], ids };
}
