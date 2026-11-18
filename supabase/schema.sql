-- =====================================================================
--  Central Asia Restaurant — база для электронного меню и двух панелей.
--  Supabase → SQL Editor → вставить целиком → Run. Можно запускать повторно:
--  меню, настройки и сотрудники при этом не теряются.
--
--  Роли и права (проверяет сама база, а не браузер):
--    гость (anon)      — читает опубликованное меню и данные ресторана. Больше ничего.
--    официант (waiter) — входит под своим аккаунтом, видит меню, цены и наличие.
--                        Только чтение: изменить ничего не может.
--    владелец (owner)  — меняет всё: меню, цены, наличие, фото, данные ресторана,
--                        расписание и доступ сотрудников.
--  Доступ получают только приглашённые email (приглашает владелец),
--  и только после подтверждения email. Первого владельца назначают
--  одной командой в SQL Editor (см. SETUP.md).
-- =====================================================================

-- ---------- Уборка после старой версии (заказы из меню больше не отправляются) ----------
drop function if exists public.place_order(text, jsonb, text, text);
drop function if exists public.order_status(uuid);
drop function if exists public.set_dish_available(text, boolean);
drop function if exists public.approve_staff(uuid, text);
drop function if exists public.update_staff(uuid, text, text);
drop table if exists public.staff_requests;
do $$ begin
  if to_regclass('public.orders') is not null then
    execute 'revoke all on public.orders from anon, authenticated';
  end if;
end $$;

-- ---------- Сотрудники ----------
create table if not exists public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  name       text not null default '',
  role       text not null default 'waiter',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff add column if not exists email text not null default '';
alter table public.staff add column if not exists role text not null default 'waiter';
alter table public.staff add column if not exists active boolean not null default true;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'staff_role_check') then
    alter table public.staff add constraint staff_role_check check (role in ('waiter', 'owner'));
  end if;
end $$;

create table if not exists public.staff_invites (
  email      text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role       text not null default 'waiter' check (role in ('waiter', 'owner')),
  name       text not null default '' check (char_length(name) <= 60),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Сотрудник = есть в staff, доступ включён и email подтверждён.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.staff s join auth.users u on u.id = s.user_id
    where s.user_id = auth.uid() and s.active and u.email_confirmed_at is not null);
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.staff s join auth.users u on u.id = s.user_id
    where s.user_id = auth.uid() and s.active and s.role = 'owner' and u.email_confirmed_at is not null);
$$;

-- Кто я (для экрана входа): роль, включён ли доступ, подтверждён ли email.
create or replace function public.whoami()
returns table (user_id uuid, email text, name text, role text, active boolean, email_confirmed boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, coalesce(s.name, ''), s.role, coalesce(s.active, false), u.email_confirmed_at is not null
  from auth.users u left join public.staff s on s.user_id = u.id
  where u.id = auth.uid();
$$;

-- Новый аккаунт: если email приглашён — становится сотрудником с этой ролью.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_inv public.staff_invites%rowtype;
begin
  select * into v_inv from public.staff_invites where email = lower(new.email);
  if found then
    insert into public.staff (user_id, email, name, role, active)
    values (new.id, lower(new.email),
            coalesce(nullif(v_inv.name, ''), left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 60)),
            v_inv.role, true)
    on conflict (user_id) do update set role = excluded.role, active = true;
    delete from public.staff_invites where email = lower(new.email);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Настройки ресторана (одна строка) ----------
create or replace function public.valid_schedule(s jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(s) = 'array' and jsonb_array_length(s) = 7 and not exists (
    select 1 from jsonb_array_elements(s) d
    where jsonb_typeof(d -> 'closed') <> 'boolean'
       or coalesce(d ->> 'open', '')  !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(d ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (d ->> 'open') = (d ->> 'close'));
$$;

create table if not exists public.settings (
  id               int primary key default 1 check (id = 1),
  name             text not null default 'Restaurant' check (char_length(btrim(name)) between 1 and 80),
  tagline          jsonb not null default '{}',
  logo_url         text check (logo_url is null or logo_url ~ '^https://'),
  currency         text not null default 'RM' check (char_length(currency) between 1 and 8),
  currency_before  boolean not null default true,
  timezone         text not null default 'Asia/Kuala_Lumpur',
  -- 7 дней, с понедельника: [{ "closed": false, "open": "10:00", "close": "22:00" }, ...]
  -- close меньше open = работа после полуночи (например 18:00–02:00)
  schedule         jsonb not null default '[{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"}]'
                   check (public.valid_schedule(schedule)),
  address          jsonb not null default '{}',
  map_url          text check (map_url is null or map_url ~ '^https://'),
  phone            text not null default '' check (phone ~ '^[+0-9 ()-]{0,30}$'),
  footer           jsonb not null default '{}',
  default_language text not null default 'en' check (default_language in ('ru', 'uz', 'en', 'ar', 'ms')),
  tables_count     int  not null default 10 check (tables_count between 1 and 200),
  updated_at       timestamptz not null default now()
);
-- старые колонки предыдущей версии, если были
alter table public.settings drop column if exists logo;
alter table public.settings drop column if exists open_time;
alter table public.settings drop column if exists close_time;
alter table public.settings drop column if exists orders_paused;
alter table public.settings add column if not exists logo_url text check (logo_url is null or logo_url ~ '^https://');
alter table public.settings add column if not exists map_url text check (map_url is null or map_url ~ '^https://');
alter table public.settings add column if not exists schedule jsonb not null default
  '[{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"}]';
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- часовой пояс должен быть настоящим (Asia/Kuala_Lumpur, Asia/Tashkent…)
create or replace function public.settings_validate()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'bad_timezone';
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists settings_touch on public.settings;
drop trigger if exists settings_validate on public.settings;
create trigger settings_validate before insert or update on public.settings
  for each row execute function public.settings_validate();

-- ---------- Меню ----------
create table if not exists public.categories (
  id         text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name       jsonb not null default '{}',
  sort       int  not null default 0,
  hidden     boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.categories drop column if exists emoji;
alter table public.categories drop column if exists hue;

create table if not exists public.dishes (
  id          text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  category_id text not null references public.categories (id) on update cascade on delete restrict,
  name        jsonb not null default '{}',
  "desc"      jsonb not null default '{}',
  ingredients jsonb not null default '{}',
  price       numeric(10, 2) not null check (price >= 0 and price < 100000),
  weight      int check (weight is null or weight between 1 and 100000),
  unit        text not null default 'g' check (unit in ('g', 'ml', 'pcs')),
  kcal        int check (kcal is null or kcal between 0 and 20000),
  photo_url   text check (photo_url is null or photo_url ~ '^https://'),
  tags        text[] not null default '{}' check (tags <@ array['hit', 'new', 'spicy', 'veg']),
  allergens   text[] not null default '{}'
              check (allergens <@ array['gluten', 'milk', 'eggs', 'fish', 'shellfish', 'nuts', 'soy', 'sesame']),
  sort        int  not null default 0,
  hidden      boolean not null default false,  -- скрыто из меню совсем
  available   boolean not null default true,   -- false = временно нет в наличии
  updated_at  timestamptz not null default now()
);
alter table public.dishes drop column if exists emoji;
create index if not exists dishes_category_idx on public.dishes (category_id, sort);

-- у названия должен быть хотя бы один язык
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dishes_name_check') then
    alter table public.dishes add constraint dishes_name_check
      check (jsonb_typeof(name) = 'object' and coalesce(name ->> 'ru', name ->> 'en', '') <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'categories_name_check') then
    alter table public.categories add constraint categories_name_check
      check (jsonb_typeof(name) = 'object' and coalesce(name ->> 'ru', name ->> 'en', '') <> '');
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
drop trigger if exists dishes_touch on public.dishes;
create trigger dishes_touch before update on public.dishes for each row execute function public.touch_updated_at();

-- ---------- Права (RLS) ----------
alter table public.staff         enable row level security;
alter table public.staff_invites enable row level security;
alter table public.settings      enable row level security;
alter table public.categories    enable row level security;
alter table public.dishes        enable row level security;

revoke all on public.staff, public.staff_invites, public.settings, public.categories, public.dishes
  from anon, authenticated;

grant select on public.settings, public.categories, public.dishes to anon, authenticated;
grant insert, update, delete on public.categories, public.dishes to authenticated;  -- политики: только владелец
grant update on public.settings to authenticated;                                  -- политики: только владелец
grant select on public.staff, public.staff_invites to authenticated;               -- политики ниже

-- Гость видит только опубликованное; сотрудники — всё, включая скрытое.
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated using (true);
drop policy if exists settings_owner on public.settings;
create policy settings_owner on public.settings for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated
  using (not hidden or public.is_staff());
drop policy if exists categories_owner_ins on public.categories;
create policy categories_owner_ins on public.categories for insert to authenticated with check (public.is_owner());
drop policy if exists categories_owner_upd on public.categories;
create policy categories_owner_upd on public.categories for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists categories_owner_del on public.categories;
create policy categories_owner_del on public.categories for delete to authenticated using (public.is_owner());

drop policy if exists dishes_read on public.dishes;
create policy dishes_read on public.dishes for select to anon, authenticated
  using ((not hidden and exists (select 1 from public.categories c where c.id = category_id and not c.hidden))
         or public.is_staff());
drop policy if exists dishes_owner_ins on public.dishes;
create policy dishes_owner_ins on public.dishes for insert to authenticated with check (public.is_owner());
drop policy if exists dishes_owner_upd on public.dishes;
create policy dishes_owner_upd on public.dishes for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists dishes_owner_del on public.dishes;
create policy dishes_owner_del on public.dishes for delete to authenticated using (public.is_owner());

drop policy if exists staff_read_self on public.staff;
drop policy if exists staff_read on public.staff;
create policy staff_read on public.staff for select to authenticated
  using (user_id = auth.uid() or public.is_owner());

drop policy if exists invites_owner_read on public.staff_invites;
create policy invites_owner_read on public.staff_invites for select to authenticated using (public.is_owner());

-- ---------- Управление сотрудниками (только владелец) ----------
create or replace function public.invite_staff(p_email text, p_role text, p_name text default '')
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  uuid;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad_email'; end if;
  if p_role not in ('waiter', 'owner') then raise exception 'bad_role'; end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if found then
    -- аккаунт уже есть — сразу даём доступ
    insert into public.staff (user_id, email, name, role, active)
    values (v_user, v_email, left(btrim(coalesce(p_name, '')), 60), p_role, true)
    on conflict (user_id) do update set role = excluded.role, active = true,
      name = coalesce(nullif(excluded.name, ''), public.staff.name);
    delete from public.staff_invites where email = v_email;
    return 'added';
  end if;
  insert into public.staff_invites (email, role, name, invited_by)
  values (v_email, p_role, left(btrim(coalesce(p_name, '')), 60), auth.uid())
  on conflict (email) do update set role = excluded.role, name = excluded.name;
  return 'invited';
end $$;

create or replace function public.revoke_invite(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  delete from public.staff_invites where email = lower(btrim(p_email));
end $$;

create or replace function public.set_staff(p_user uuid, p_role text, p_name text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_old public.staff%rowtype;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if p_role not in ('waiter', 'owner') then raise exception 'bad_role'; end if;
  select * into v_old from public.staff where user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  if p_user = auth.uid() and (not p_active or p_role <> 'owner') then raise exception 'self'; end if;
  if v_old.role = 'owner' and v_old.active and (p_role <> 'owner' or not p_active)
     and (select count(*) from public.staff where role = 'owner' and active) <= 1 then
    raise exception 'last_owner';
  end if;
  update public.staff
     set role = p_role, active = p_active, name = left(btrim(coalesce(p_name, name)), 60)
   where user_id = p_user;
end $$;

create or replace function public.remove_staff(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'self'; end if;
  if (select role from public.staff where user_id = p_user) = 'owner'
     and (select count(*) from public.staff where role = 'owner' and active) <= 1 then
    raise exception 'last_owner';
  end if;
  delete from public.staff where user_id = p_user;
end $$;

-- Первый владелец: запускается ОДИН РАЗ из SQL Editor (у гостей и сотрудников нет прав на эту функцию).
create or replace function public.bootstrap_owner(p_email text, p_name text default '')
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  uuid;
begin
  if exists (select 1 from public.staff where role = 'owner' and active) then
    raise exception 'owner_exists';
  end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if found then
    insert into public.staff (user_id, email, name, role, active) values (v_user, v_email, coalesce(p_name, ''), 'owner', true)
    on conflict (user_id) do update set role = 'owner', active = true;
    return 'owner added';
  end if;
  insert into public.staff_invites (email, role, name) values (v_email, 'owner', coalesce(p_name, ''))
  on conflict (email) do update set role = 'owner';
  return 'owner invited: register with this email';
end $$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_owner() from public;
revoke all on function public.whoami() from public;
revoke all on function public.invite_staff(text, text, text) from public;
revoke all on function public.revoke_invite(text) from public;
revoke all on function public.set_staff(uuid, text, text, boolean) from public;
revoke all on function public.remove_staff(uuid) from public;
revoke all on function public.bootstrap_owner(text, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.whoami() to authenticated;
grant execute on function public.invite_staff(text, text, text) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;
grant execute on function public.set_staff(uuid, text, text, boolean) to authenticated;
grant execute on function public.remove_staff(uuid) to authenticated;

-- ---------- Фото блюд и логотип (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dish_photos_read on storage.objects;
drop policy if exists dish_photos_owner_ins on storage.objects;
drop policy if exists dish_photos_owner_upd on storage.objects;
drop policy if exists dish_photos_owner_del on storage.objects;
drop policy if exists menu_photos_owner_read on storage.objects;
create policy menu_photos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'menu-photos' and public.is_owner());
drop policy if exists menu_photos_owner_ins on storage.objects;
create policy menu_photos_owner_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and public.is_owner());
drop policy if exists menu_photos_owner_upd on storage.objects;
create policy menu_photos_owner_upd on storage.objects for update to authenticated
  using (bucket_id = 'menu-photos' and public.is_owner()) with check (bucket_id = 'menu-photos' and public.is_owner());
drop policy if exists menu_photos_owner_del on storage.objects;
create policy menu_photos_owner_del on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and public.is_owner());

-- ---------- Живые обновления (Realtime) ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['dishes', 'categories', 'settings'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
