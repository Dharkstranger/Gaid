-- GAID's server is the only door (docs/architecture.md).
--
-- Both functions now take GAID's own server secret first and do nothing
-- without it. Only sha256 of the secret is stored, in gaid.settings, which
-- nothing outside these functions can read. The secret itself lives only in
-- GAID's Vercel settings (GAID_DB_SECRET). It is never Galleris's secret key:
-- that one opens the whole database.
--
-- With no hash set yet, every call is refused — the safe default until the
-- owner's Vercel holds the secret.
--
-- Applied 11 October 2026 as two migrations (gaid_server_secret_1_settings,
-- gaid_server_secret_2_functions); this file is both, in order.

create table if not exists gaid.settings (
  key   text primary key,
  value text not null
);
alter table gaid.settings enable row level security;
revoke all on gaid.settings from public, anon, authenticated;

create or replace function gaid.server_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_secret, '') <> ''
     and exists (select 1 from gaid.settings s
                  where s.key = 'server_secret_sha256'
                    and s.value = encode(extensions.digest('gaid.server.v1:' || p_secret, 'sha256'), 'hex'));
$$;
revoke all on function gaid.server_ok(text) from public, anon, authenticated;

-- The two old, keyless functions are renamed, not dropped: Supabase's
-- connector holds a DROP for a confirmation this session cannot show, and
-- they were already locked to everyone (20261011130000). Retired, unreachable.
alter function public.gaid_record_question(text, text, text, text) rename to gaid_retired_record_question;
alter function public.gaid_questions(text, text) rename to gaid_retired_questions;

create or replace function public.gaid_record_question(p_secret text, p_slug text, p_work_id text, p_question text, p_lang text default '')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  q text := left(btrim(coalesce(p_question, '')), 300);
begin
  if not gaid.server_ok(p_secret) then return false; end if;
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

create or replace function public.gaid_questions(p_secret text, p_slug text, p_key text default null)
returns table (work_id text, question text, times bigint, last_asked timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not gaid.server_ok(p_secret) then return; end if;
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
    select q.work_id, min(q.question) as question, count(*) as times, max(q.asked_at) as last_asked
      from gaid.questions q
     where q.slug = p_slug and q.asked_at > now() - interval '180 days'
     group by q.work_id, lower(regexp_replace(regexp_replace(btrim(q.question), '[?!.]+$', ''), '\s+', ' ', 'g'))
     order by times desc, last_asked desc
     limit 100;
end
$$;

-- The publishable key may knock; only GAID's secret opens.
revoke execute on function public.gaid_record_question(text, text, text, text, text) from public;
revoke execute on function public.gaid_questions(text, text, text) from public;
grant execute on function public.gaid_record_question(text, text, text, text, text) to anon, service_role;
grant execute on function public.gaid_questions(text, text, text) to anon, service_role;
