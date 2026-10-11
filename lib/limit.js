/* Brakes, per caller, per running copy of the function. Not a wall — Vercel
   runs several copies — but one stuck microphone or one bored script cannot
   run up the bill or flood the database. Over a limit, a visitor still gets
   the gallery's own words where there is a way to give them. */
const WINDOW_MS = 60_000;
const NOVA = Number(process.env.GAID_PER_MINUTE || 20);
const buckets = new Map();       // bucket -> Map(who -> times)

export function allow(who, now = Date.now(), max = NOVA, bucket = 'nova') {
  const seen = buckets.get(bucket) ?? buckets.set(bucket, new Map()).get(bucket);
  const recent = (seen.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) { seen.set(who, recent); return false; }
  recent.push(now);
  seen.set(who, recent);
  if (seen.size > 5000) seen.clear();
  return true;
}
