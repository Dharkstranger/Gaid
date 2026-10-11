/* A small brake on the one thing that costs money: questions sent to the
   model. Twenty a minute per caller, per running copy of the function. It is
   not a wall — Vercel runs several copies — it stops one stuck microphone or
   one bored script from running up the bill. Over the limit, the visitor
   still gets the gallery's own words. */
const WINDOW_MS = 60_000;
const MAX = Number(process.env.GAID_PER_MINUTE || 20);
const seen = new Map();

export function allow(who, now = Date.now()) {
  const recent = (seen.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX) { seen.set(who, recent); return false; }
  recent.push(now);
  seen.set(who, recent);
  if (seen.size > 5000) seen.clear();
  return true;
}
