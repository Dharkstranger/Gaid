-- Lock GAID's two doors until GAID's own server holds its own secret
-- (docs/architecture.md). Found 11 October 2026: with the publishable key,
-- anyone could write 300 questions an hour to EVERY made-up gallery name —
-- an unbounded table in a database GAID shares with Galleris.
revoke execute on function public.gaid_record_question(text, text, text, text) from anon, authenticated;
revoke execute on function public.gaid_questions(text, text) from anon, authenticated;
