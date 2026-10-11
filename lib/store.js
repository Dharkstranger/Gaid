/**
 * GAID's one outside store: the questions a gallery has not answered yet,
 * in its own walled-off section of a Supabase database
 * (supabase/migrations/20261011120000_gaid_questions.sql).
 *
 * Two narrow doors and nothing else: record a question, read a gallery's list.
 * The key here is the publishable one, on purpose: it reaches only those two
 * functions, which check every argument themselves.
 *
 * Nothing in here may turn a visitor away. Every failure — no network, a
 * timeout, a refusal, a body that is not ours — is null or false, and the
 * visitor never knows a list exists.
 */
export const SUPABASE_URL = process.env.GAID_SUPABASE_URL || 'https://gudymczklujytsozwrsy.supabase.co';
export const SUPABASE_KEY = process.env.GAID_SUPABASE_KEY || 'sb_publishable_6fEAZc7ycde2oThx-dd59A_jfi6NAUe';
const OFF = process.env.GAID_QUESTIONS === 'off';

async function rpc(name, args, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(t);
  }
}

/** Keep one unanswered question. true if kept. Waits at most 1.5 s. */
export async function recordUnanswered({ slug, workId = '', question, lang = '' }) {
  if (OFF || !question) return false;
  const out = await rpc('gaid_record_question', { p_slug: slug, p_work_id: workId, p_question: question, p_lang: lang }, 1500);
  return out === true;
}

/** A gallery's unanswered questions, most asked first, or null if they cannot be read. */
export async function readQuestions(slug, key = null) {
  if (OFF) return null;
  const out = await rpc('gaid_questions', { p_slug: slug, p_key: key }, 4000);
  // Only a list of rows shaped like ours counts: a proxy's own JSON is not a list of questions.
  if (!Array.isArray(out) || !out.every((r) => r && typeof r.question === 'string' && Number.isFinite(Number(r.times)))) return null;
  return out.map((r) => ({ workId: String(r.work_id ?? ''), question: r.question, times: Number(r.times), lastAsked: r.last_asked }));
}

/** Did GAID have to say the gallery has not said? */
export const SAID_NOTHING = /\b(has not|hasn['’]t) (said|given|written)\b|\bonly know what\b/i;
