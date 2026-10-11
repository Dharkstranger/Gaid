-- GAID, said "guide": the questions a gallery has not answered yet.
--
-- Lives in Galleris's Supabase project (the owner's choice, 11 October 2026:
-- the free plan's two projects were both in use), walled off in its own
-- schema. Nothing here reads or changes anything of Galleris's except one
-- lookup: the fingerprint of a curator's edit key in public.museums, to decide
-- who may read their own gallery's list.
--
-- WHAT IS KEPT: the question as typed or spoken, the gallery, the work, the
-- language, the moment. No device id, no address, no name, no IP. Swept after
-- 180 days.
--
-- WHY: when GAID has to say "the gallery has not said", that question is the
-- most useful thing a curator could be told. Fourteen people asking what the
-- red means is a wall label waiting to be written.
--
-- THE DOORS: the table has row-level security on and no policy, and the
-- schema is not exposed, so nothing reaches it directly. Two functions are the
-- only way in, each doing one checked thing. They are SECURITY DEFINER in
-- public on purpose — that is what makes them callable with the publishable
-- key — and so each validates every argument itself and pins search_path.

create schema if not exists gaid;
revoke all on schema gaid from public;
revoke all on schema gaid from anon;
revoke all on schema gaid from authenticated;

create table if not exists gaid.questions (
  id        bigint generated always as identity primary key,
  slug      text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$'),
  work_id   text not null default '' check (length(work_id) <= 64),
  question  text not null check (length(question) between 1 and 300),
  lang      text not null default '' check (length(lang) <= 40),
  asked_at  timestamptz not null default now()
);
create index if not exists questions_slug_asked_idx on gaid.questions (slug, asked_at desc);
alter table gaid.questions enable row level security;
revoke all on gaid.questions from public, anon, authenticated;

-- Record one unanswered question. Returns true if kept. At most 300 an hour
-- per gallery, so one stuck microphone cannot fill the table.
create or replace function public.gaid_record_question(p_slug text, p_work_id text, p_question text, p_lang text default '')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  q text := left(btrim(coalesce(p_question, '')), 300);
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$' then return false; end if;
  if q = '' then return false; end if;
  select count(*) into recent from gaid.questions
   where slug = p_slug and asked_at > now() - interval '1 hour';
  if recent >= 300 then return false; end if;
  insert into gaid.questions (slug, work_id, question, lang)
  values (p_slug, left(coalesce(p_work_id, ''), 64), q, left(coalesce(p_lang, ''), 40));
  return true;
end
$$;

-- A gallery's unanswered questions, grouped, most asked first. Only for the
-- holder of that gallery's edit key — or for GAID's own public demos, whose
-- lists are part of the demo. A wrong key and an unknown gallery answer
-- identically (nothing), or this becomes a way to learn which galleries exist.
create or replace function public.gaid_questions(p_slug text, p_key text default null)
returns table (work_id text, question text, times bigint, last_asked timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$' then return; end if;
  if not (
    p_slug = any (array['sample', 'openaccess'])
    or exists (
      select 1 from public.museums m
       where m.slug = p_slug
         and m.key_hash = encode(extensions.digest('galleris.museum.v1:' || coalesce(p_key, ''), 'sha256'), 'hex')
    )
  ) then return; end if;
  return query
    select q.work_id,
           min(q.question) as question,
           count(*) as times,
           max(q.asked_at) as last_asked
      from gaid.questions q
     where q.slug = p_slug and q.asked_at > now() - interval '180 days'
     group by q.work_id, lower(regexp_replace(regexp_replace(btrim(q.question), '[?!.]+$', ''), '\s+', ' ', 'g'))
     order by times desc, last_asked desc
     limit 100;
end
$$;

revoke execute on function public.gaid_record_question(text, text, text, text) from public;
revoke execute on function public.gaid_questions(text, text) from public;
grant execute on function public.gaid_record_question(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.gaid_questions(text, text) to anon, authenticated, service_role;

-- Swept daily, 03:17 UTC: nothing older than 180 days.
select cron.schedule('gaid-questions-sweep', '17 3 * * *',
  $$delete from gaid.questions where asked_at < now() - interval '180 days'$$);
