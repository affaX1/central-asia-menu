-- Минимальная имитация Supabase для локальных тестов (НЕ запускать в Supabase).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}',
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create publication supabase_realtime;
-- имитация pg_net: запросы не уходят в интернет, а пишутся в таблицу
create schema net;
create table net.sent (id bigserial primary key, url text, body jsonb, at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.sent (url, body) values (url, body) returning id $$;
create table net._http_response (id bigint primary key, status_code int, content text);
create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.sent (url, body) values (url, null) returning id $$;

-- имитация расширения http (pgsql-http): SMS в Twilio не уходят, а пишутся в extensions.http_outbox.
-- Ответ — статус из test.http_status (по умолчанию 201; 0 — «нет связи»).
create schema extensions;
grant usage on schema extensions to anon, authenticated;
create domain extensions.http_method as text;
create type extensions.http_header as (field varchar, value varchar);
create type extensions.http_request as (method extensions.http_method, uri varchar, headers extensions.http_header[], content_type varchar, content varchar);
create type extensions.http_response as (status integer, content_type varchar, headers extensions.http_header[], content varchar);
create table extensions.http_outbox (id bigserial primary key, method text, uri text, auth text, content_type text, content text, at timestamptz default now());
create function extensions.http(r extensions.http_request) returns extensions.http_response language plpgsql as $$
declare v_status int := coalesce(nullif(current_setting('test.http_status', true), ''), '201')::int;
begin
  insert into extensions.http_outbox (method, uri, auth, content_type, content)
  values (r.method, r.uri, (select h.value from unnest(r.headers) h where h.field = 'Authorization' limit 1), r.content_type, r.content);
  if v_status = 0 then raise exception 'Timeout was reached'; end if;
  return row(v_status, 'application/json', array[]::extensions.http_header[], '{}')::extensions.http_response;
end $$;

-- помощники тестов
-- значение поля из тела формы (a=1&b=%D0%BA…) — раскодированное
create function public.t_form(p text, k text) returns text language plpgsql as $$
declare part text; v text; res bytea := ''::bytea; i int := 1; c text;
begin
  foreach part in array string_to_array(coalesce(p, ''), '&') loop
    if split_part(part, '=', 1) = k then v := substr(part, length(k) + 2); exit; end if;
  end loop;
  if v is null then return null; end if;
  v := replace(v, '+', ' ');
  while i <= length(v) loop
    c := substr(v, i, 1);
    if c = '%' then res := res || decode(substr(v, i + 1, 2), 'hex'); i := i + 3;
    else res := res || convert_to(c, 'UTF8'); i := i + 1; end if;
  end loop;
  return convert_from(res, 'UTF8');
end $$;
grant execute on function public.t_form(text, text) to anon, authenticated;
create function public.t_ok(ok boolean, msg text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
grant execute on function public.t_ok(boolean, text) to anon, authenticated;
-- выполнить SQL и убедиться, что он упал с ошибкой, содержащей pattern
create function public.t_fails(sql text, pattern text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm ~* pattern then raise notice 'ok  %', msg; return; end if;
    raise exception 'FAIL: % (wrong error: %)', msg, sqlerrm;
  end;
  raise exception 'FAIL: % (no error)', msg;
end $$;
grant execute on function public.t_fails(text, text, text) to anon, authenticated;
-- выполнить UPDATE/DELETE и вернуть число затронутых строк
create function public.t_rows(sql text) returns int language plpgsql as $$
declare n int;
begin
  execute sql; get diagnostics n = row_count; return n;
end $$;
grant execute on function public.t_rows(text) to anon, authenticated;
