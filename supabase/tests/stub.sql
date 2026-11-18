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

-- помощники тестов
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
