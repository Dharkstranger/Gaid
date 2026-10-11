/**
 * What a TV may show, signed by GAID's server.
 *
 * The phone-to-TV channel is public: anyone who guesses a TV's code can send
 * it a message. So a message carries a seal — the answer, signed with
 * GAID_SIGNING_SECRET (Vercel only) — and the TV asks GAID's server to open
 * it (api/seal.js). An unsigned or altered message is dropped.
 *
 * The seal holds no visitor's words: a TV shows the topic (Artist, Date…),
 * never the question as typed, because anyone can type anything.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// No secret set (a laptop, a test): one made up for this process. On Vercel
// several copies run, so production must set GAID_SIGNING_SECRET.
const SECRET = process.env.GAID_SIGNING_SECRET || randomBytes(32).toString('hex');
export const MAX_AGE_MS = 15 * 60_000;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (body) => createHmac('sha256', SECRET).update(`gaid.seal.v1:${body}`).digest();

/** { slug, workId, topic, say } -> a token a TV can ask GAID to open. */
export function seal({ slug, workId, topic, say }, now = Date.now()) {
  const body = b64(JSON.stringify({ s: slug, w: workId ?? '', t: topic ?? 'about', a: String(say ?? '').slice(0, 2000), i: now }));
  return `${body}.${b64(sign(body))}`;
}

/** The answer inside a token, or null if it is not GAID's, was altered, or is stale. */
export function unseal(token, now = Date.now()) {
  const [body, mac] = String(token ?? '').split('.');
  if (!body || !mac || body.length > 6000) return null;
  const want = sign(body);
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!p || typeof p.a !== 'string' || !Number.isFinite(p.i) || now - p.i > MAX_AGE_MS || p.i - now > 60_000) return null;
  return { slug: p.s, workId: p.w, topic: p.t, say: p.a };
}
