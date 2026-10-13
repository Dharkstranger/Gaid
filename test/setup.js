/* Loaded before every test file (npm test). Tests never talk to production:
   GitHub's runners can reach *.supabase.co, and a test that asks an
   unanswered question would otherwise write it into the real database.
   test/store.test.js points the store at its own stand-in instead. */
process.env.GAID_QUESTIONS = 'off';
process.env.GALLERIS_LOCAL_DIR ??= new URL('../fixtures', import.meta.url).pathname;   // never the network
process.env.GAID_SUPABASE_URL = 'http://127.0.0.1:9';
delete process.env.AWS_BEARER_TOKEN_BEDROCK;
delete process.env.GAID_AWS_ACCESS_KEY_ID;
delete process.env.AI_GATEWAY_API_KEY;   // and never Vercel's AI Gateway: a test spends nothing
delete process.env.VERCEL;

// And if anything still tries, the file fails — even though the store, rightly,
// swallows every network error so a visitor never sees one.
const reached = [];
const real = globalThis.fetch;
globalThis.fetch = (url, init) => {
  if (/gudymczklujytsozwrsy\.supabase\.co|ai-gateway\.vercel\.sh/.test(String(url))) {
    reached.push(String(url));
    return Promise.reject(new Error('a test reached production'));
  }
  return real(url, init);
};
process.on('exit', () => {
  if (reached.length) { console.error(`A test reached production: ${reached.join(', ')}`); process.exitCode = 1; }
});
