-- =====================================================================
--  Central Asia Restaurant — база для электронного меню и двух панелей.
--  Supabase → SQL Editor → вставить целиком → Run. Можно запускать повторно:
--  меню, настройки и сотрудники при этом не теряются.
--
--  Роли и права (проверяет сама база, а не браузер):
--    гость (anon)      — читает опубликованное меню, проверяет свой стол по QR,
--                        отправляет заказ и видит только СВОЙ заказ (по секретному ключу).
--    официант (waiter) — входит под своим аккаунтом, видит меню, цены, наличие и заказы,
--                        может только ПРИНЯТЬ новый заказ. Меню, столы, настройки — только чтение.
--    владелец (owner)  — меняет всё: заказы и их статусы, меню, цены, наличие, фото,
--                        столы и QR-коды, данные ресторана, расписание и сотрудников.
--  Доступ получают только приглашённые email (приглашает владелец),
--  и только после подтверждения email. Первого владельца назначают
--  одной командой в SQL Editor (см. SETUP.md).
-- =====================================================================

-- ---------- Уборка после прошлых версий ----------
drop function if exists public.place_order(text, jsonb, text, text);
drop function if exists public.order_status(uuid);
drop function if exists public.set_dish_available(text, boolean);
drop function if exists public.approve_staff(uuid, text);
drop function if exists public.update_staff(uuid, text, text);
drop table if exists public.staff_requests;
-- самая первая версия заказов (номер стола текстом, без проверки) — убираем в архив, не удаляя
do $$ begin
  if to_regclass('public.orders') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'table_no')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'client_key') then
    execute 'alter table public.orders rename to orders_v1_archive';
    execute 'revoke all on public.orders_v1_archive from anon, authenticated';
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
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (role in ('waiter', 'owner', 'cook'));

create table if not exists public.staff_invites (
  email      text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role       text not null default 'waiter',
  name       text not null default '' check (char_length(name) <= 60),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check check (role in ('waiter', 'owner', 'cook'));

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

-- Роль текущего сотрудника (null — не сотрудник / нет доступа / email не подтверждён)
create or replace function public.staff_role()
returns text language sql stable security definer set search_path = public, auth as $$
  select s.role from public.staff s join auth.users u on u.id = s.user_id
  where s.user_id = auth.uid() and s.active and u.email_confirmed_at is not null;
$$;
-- Зал: официант или владелец (принимают заказы, вызовы, счета)
create or replace function public.is_floor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role() in ('waiter', 'owner'), false);
$$;
-- Кухня: повар или владелец
create or replace function public.is_kitchen()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role() in ('cook', 'owner'), false);
$$;
-- Имя текущего сотрудника для подписи действий
create or replace function public.staff_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(s.name, ''), s.email) from public.staff s where s.user_id = auth.uid();
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
  orders_enabled   boolean not null default true,   -- принимать заказы из меню
  orders_when_closed boolean not null default false, -- принимать и вне часов работы
  halal            boolean not null default false,  -- «Халяль» — только если ресторан это подтвердил
  halal_note       jsonb not null default '{}',     -- например данные сертификата; пусто — не показываем
  updated_at       timestamptz not null default now()
);
-- старые колонки предыдущей версии, если были
alter table public.settings drop column if exists logo;
alter table public.settings drop column if exists open_time;
alter table public.settings drop column if exists close_time;
alter table public.settings add column if not exists logo_url text check (logo_url is null or logo_url ~ '^https://');
alter table public.settings add column if not exists map_url text check (map_url is null or map_url ~ '^https://');
alter table public.settings add column if not exists orders_enabled boolean not null default true;
alter table public.settings add column if not exists orders_when_closed boolean not null default false;
alter table public.settings add column if not exists halal boolean not null default false;
alter table public.settings add column if not exists halal_note jsonb not null default '{}';
alter table public.settings add column if not exists schedule jsonb not null default
  '[{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"}]';
alter table public.settings add column if not exists service_pct numeric(5, 2) not null default 0 check (service_pct between 0 and 30);
alter table public.settings add column if not exists tax_pct numeric(5, 2) not null default 0 check (tax_pct between 0 and 30);
alter table public.settings add column if not exists tax_name text not null default 'SST' check (char_length(tax_name) between 1 and 20);
alter table public.settings add column if not exists tax_on_service boolean not null default true;
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
  meat        text[] not null default '{}'      -- вид мяса; пусто = ресторан ещё не указал
              check (meat <@ array['beef', 'lamb', 'horse', 'chicken', 'fish', 'seafood']),
  sort        int  not null default 0,
  hidden      boolean not null default false,  -- скрыто из меню совсем
  available   boolean not null default true,   -- false = временно нет в наличии
  updated_at  timestamptz not null default now()
);
alter table public.dishes drop column if exists emoji;
alter table public.dishes add column if not exists meat text[] not null default '{}'
  check (meat <@ array['beef', 'lamb', 'horse', 'chicken', 'fish', 'seafood']);
create index if not exists dishes_category_idx on public.dishes (category_id, sort);

-- Варианты блюда: [{ id, name{ru,en..}, multi, required, choices: [{ id, name{..}, price }] }]
-- price у варианта — доплата (или скидка) к цене блюда, например «0.5 порции» = -10.
create or replace function public.valid_options(o jsonb)
returns boolean language plpgsql immutable as $$
declare g jsonb; c jsonb; gids text[] := '{}'; cids text[];
begin
  if o is null or jsonb_typeof(o) <> 'array' or jsonb_array_length(o) > 6 then return false; end if;
  for g in select value from jsonb_array_elements(o) loop
    if jsonb_typeof(g) <> 'object' or coalesce(g ->> 'id', '') !~ '^[a-z0-9-]{1,30}$' or (g ->> 'id') = any (gids) then return false; end if;
    gids := gids || (g ->> 'id');
    if jsonb_typeof(g -> 'name') is distinct from 'object' or coalesce(g -> 'name' ->> 'ru', g -> 'name' ->> 'en', '') = '' then return false; end if;
    if jsonb_typeof(coalesce(g -> 'multi', 'false')) <> 'boolean' or jsonb_typeof(coalesce(g -> 'required', 'false')) <> 'boolean' then return false; end if;
    if jsonb_typeof(g -> 'choices') is distinct from 'array' or jsonb_array_length(g -> 'choices') not between 1 and 12 then return false; end if;
    cids := '{}';
    for c in select value from jsonb_array_elements(g -> 'choices') loop
      if jsonb_typeof(c) <> 'object' or coalesce(c ->> 'id', '') !~ '^[a-z0-9-]{1,30}$' or (c ->> 'id') = any (cids) then return false; end if;
      cids := cids || (c ->> 'id');
      if jsonb_typeof(c -> 'name') is distinct from 'object' or coalesce(c -> 'name' ->> 'ru', c -> 'name' ->> 'en', '') = '' then return false; end if;
      if jsonb_typeof(coalesce(c -> 'price', '0')) <> 'number' or coalesce((c ->> 'price')::numeric, 0) not between -10000 and 10000 then return false; end if;
    end loop;
  end loop;
  return true;
end $$;
alter table public.dishes add column if not exists options jsonb not null default '[]';
alter table public.dishes drop constraint if exists dishes_options_check;
alter table public.dishes add constraint dishes_options_check check (public.valid_options(options));

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
  if p_role not in ('waiter', 'owner', 'cook') then raise exception 'bad_role'; end if;
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
  if p_role not in ('waiter', 'owner', 'cook') then raise exception 'bad_role'; end if;
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
revoke all on function public.staff_role() from public;
revoke all on function public.is_floor() from public;
revoke all on function public.is_kitchen() from public;
revoke all on function public.staff_name() from public;
revoke all on function public.invite_staff(text, text, text) from public;
revoke all on function public.revoke_invite(text) from public;
revoke all on function public.set_staff(uuid, text, text, boolean) from public;
revoke all on function public.remove_staff(uuid) from public;
revoke all on function public.bootstrap_owner(text, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.whoami() to authenticated;
grant execute on function public.staff_role() to authenticated;
grant execute on function public.is_floor() to authenticated;
grant execute on function public.is_kitchen() to authenticated;
grant execute on function public.staff_name() to authenticated;
grant execute on function public.invite_staff(text, text, text) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;
grant execute on function public.set_staff(uuid, text, text, boolean) to authenticated;
grant execute on function public.remove_staff(uuid) to authenticated;

-- =====================================================================
--  СТОЛЫ И ЗАКАЗЫ
-- =====================================================================

-- ---------- Столы: у каждого свой секретный код для QR ----------
create table if not exists public.tables (
  id         uuid primary key default gen_random_uuid(),
  label      text not null check (char_length(btrim(label)) between 1 and 20),
  token      text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)
             check (token ~ '^[a-f0-9]{20}$'),
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists tables_label_uniq on public.tables (lower(btrim(label)));

-- ---------- Заказы ----------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  no          bigint generated always as identity (start with 1001) unique, -- номер заказа: уникальный, не повторяется
  table_id    uuid references public.tables (id) on delete set null,
  table_label text not null,                                  -- стол на момент заказа
  items       jsonb not null,                                 -- [{ id, qty, price, name }] — проверено сервером
  total       numeric(10, 2) not null check (total >= 0),
  note        text check (note is null or char_length(note) <= 300),
  lang        text check (lang is null or char_length(lang) <= 5),
  status      text not null default 'new' check (status in ('new', 'accepted', 'cooking', 'ready', 'cancelled')),
  client_key  uuid not null unique,                           -- защита от двойной отправки
  guest_token uuid not null default gen_random_uuid(),        -- секрет гостя: только он видит свой заказ
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at    timestamptz,
  cancelled_at timestamptz,
  status_by   uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_by_name text
);
alter table public.orders add column if not exists accepted_by uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists accepted_by_name text;
alter table public.orders add column if not exists subtotal numeric(10, 2);          -- сумма блюд (без сбора и налога)
alter table public.orders add column if not exists service numeric(10, 2) not null default 0;
alter table public.orders add column if not exists tax numeric(10, 2) not null default 0;
alter table public.orders add column if not exists cooking_at timestamptz;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists bill_id uuid;
alter table public.orders add column if not exists edited_at timestamptz;
alter table public.orders add column if not exists edited_by_name text;
update public.orders set subtotal = total where subtotal is null;
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_table_created_idx on public.orders (table_id, created_at desc);
create index if not exists orders_active_idx on public.orders (status) where status in ('new', 'accepted', 'cooking', 'ready');

create or replace function public.orders_on_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_by := auth.uid();
    if new.status = 'accepted' and new.accepted_at is null then
      new.accepted_at := now();
      new.accepted_by := coalesce(new.accepted_by, auth.uid());
    end if;
    if new.status = 'cooking' and new.cooking_at is null then new.cooking_at := now(); end if;
    if new.status = 'ready' then new.ready_at := now(); end if;
    if new.status = 'cancelled' then new.cancelled_at := now(); else new.cancelled_at := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_on_update on public.orders;
create trigger orders_on_update before update on public.orders for each row execute function public.orders_on_update();

-- ---------- Открыт ли ресторан сейчас (по расписанию и часовому поясу ресторана) ----------
create or replace function public.hm(t text) returns int language sql immutable as $$
  select split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int;
$$;

create or replace function public.restaurant_open(p_at timestamptz default now())
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  s   public.settings%rowtype;
  lt  timestamp;
  d   int;
  m   int;
  td  jsonb;
  pd  jsonb;
begin
  select * into s from public.settings where id = 1;
  lt := p_at at time zone s.timezone;
  d  := extract(isodow from lt)::int - 1;                 -- 0 = понедельник
  m  := extract(hour from lt)::int * 60 + extract(minute from lt)::int;
  pd := s.schedule -> ((d + 6) % 7);                      -- вчера: хвост ночной смены
  if not (pd ->> 'closed')::boolean and public.hm(pd ->> 'close') < public.hm(pd ->> 'open')
     and m < public.hm(pd ->> 'close') then
    return true;
  end if;
  td := s.schedule -> d;
  if (td ->> 'closed')::boolean then return false; end if;
  if public.hm(td ->> 'close') > public.hm(td ->> 'open') then
    return m >= public.hm(td ->> 'open') and m < public.hm(td ->> 'close');
  end if;
  return m >= public.hm(td ->> 'open');
end $$;

-- ---------- Права ----------
alter table public.tables enable row level security;
alter table public.orders enable row level security;
revoke all on public.tables, public.orders from anon, authenticated;
-- столы и заказы видит и меняет только владелец; гость — только через функции ниже
grant select, insert, update, delete on public.tables to authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists tables_owner_all on public.tables;
create policy tables_owner_all on public.tables for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists orders_owner_read on public.orders;
drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read on public.orders for select to authenticated using (public.is_staff());
drop policy if exists orders_owner_status on public.orders;
create policy orders_owner_status on public.orders for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- Гость: проверить стол по коду из QR ----------
create or replace function public.table_info(p_token text)
returns table (label text) language sql stable security definer set search_path = public as $$
  select t.label from public.tables t
  where t.token = lower(btrim(coalesce(p_token, ''))) and t.active;
$$;

-- ---------- Сервисный сбор и налог (из настроек ресторана) ----------
create or replace function public.order_charges(p_subtotal numeric)
returns table (service numeric, tax numeric, total numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_set public.settings%rowtype; v_srv numeric(10, 2); v_tax numeric(10, 2);
begin
  select * into v_set from public.settings where id = 1;
  v_srv := round(p_subtotal * coalesce(v_set.service_pct, 0) / 100, 2);
  v_tax := round((p_subtotal + case when coalesce(v_set.tax_on_service, true) then v_srv else 0 end) * coalesce(v_set.tax_pct, 0) / 100, 2);
  return query select v_srv, v_tax, (p_subtotal + v_srv + v_tax)::numeric(10, 2);
end $$;

-- ---------- Проверить одну позицию заказа: блюдо, варианты, цена за штуку ----------
-- p_item: { "id": "plov-tashkent", "qty": 2, "price": 28, "opts": ["half"] }
-- Возвращает строку для снимка заказа: { id, qty, price (за штуку, с вариантами), name, opts: [{ g, c, name, price }] }
create or replace function public.order_line(p_item jsonb, p_check_price boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_id text := p_item ->> 'id';
  v_qty int; v_seen numeric; v_dish public.dishes%rowtype;
  v_opts jsonb := coalesce(p_item -> 'opts', '[]'::jsonb);
  v_sel text[] := '{}'; v_unit numeric(10, 2); v_snap jsonb := '[]'::jsonb;
  g jsonb; c jsonb; n int;
begin
  begin
    v_qty := (p_item ->> 'qty')::int;
    v_seen := (p_item ->> 'price')::numeric;
  exception when others then raise exception 'bad_items'; end;
  if v_id is null or v_id !~ '^[a-z0-9-]{1,40}$' or v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'bad_items'; end if;
  if p_check_price and v_seen is null then raise exception 'bad_items'; end if;
  if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) > 20 then raise exception 'bad_items'; end if;
  select array_agg(value order by value) into v_sel from jsonb_array_elements_text(v_opts);
  v_sel := coalesce(v_sel, '{}');

  select d.* into v_dish from public.dishes d join public.categories c2 on c2.id = d.category_id
    where d.id = v_id and not d.hidden and not c2.hidden;
  if not found or not v_dish.available then raise exception 'unavailable:%', v_id; end if;

  v_unit := v_dish.price;
  -- каждый выбранный вариант должен быть у этого блюда; обязательные группы — выбраны; одиночные — не больше одного
  for g in select value from jsonb_array_elements(v_dish.options) loop
    n := 0;
    for c in select value from jsonb_array_elements(g -> 'choices') loop
      if ((g ->> 'id') || ':' || (c ->> 'id')) = any (v_sel) then
        n := n + 1;
        v_unit := v_unit + coalesce((c ->> 'price')::numeric, 0);
        v_snap := v_snap || jsonb_build_array(jsonb_build_object('g', g ->> 'id', 'c', c ->> 'id', 'group', g -> 'name', 'name', c -> 'name', 'price', coalesce((c ->> 'price')::numeric, 0)));
      end if;
    end loop;
    if coalesce((g ->> 'required')::boolean, false) and n = 0 then raise exception 'options:%', v_id; end if;
    if not coalesce((g ->> 'multi')::boolean, false) and n > 1 then raise exception 'options:%', v_id; end if;
  end loop;
  if jsonb_array_length(v_snap) <> cardinality(v_sel) then raise exception 'options:%', v_id; end if;
  if v_unit < 0 then v_unit := 0; end if;
  if p_check_price and v_unit <> v_seen then raise exception 'price_changed:%', v_id; end if;

  return jsonb_build_object('id', v_id, 'qty', v_qty, 'price', v_unit, 'name', v_dish.name, 'opts', v_snap,
                            'key', v_id || '|' || array_to_string(v_sel, ','));
end $$;

-- ---------- Гость: отправить заказ ----------
-- p_items: [{ "id": "plov-tashkent", "qty": 2, "price": 28, "opts": ["portion:half"] }] — price = цена за штуку, которую гость видел.
-- Если цена изменилась или блюдо закончилось — заказ НЕ создаётся, гость видит актуальные данные.
-- p_client_key: один и тот же ключ при повторной отправке — вернётся тот же заказ, второй не создастся.
drop function if exists public.place_order(text, jsonb, text, text, uuid);
create or replace function public.place_order(
  p_table text, p_items jsonb, p_note text, p_lang text, p_client_key uuid
)
returns table (id uuid, no bigint, guest_token uuid, total numeric, status text, table_label text, items jsonb, note text, created_at timestamptz,
               subtotal numeric, service numeric, tax numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_set   public.settings%rowtype;
  v_tab   public.tables%rowtype;
  v_old   public.orders%rowtype;
  v_item  jsonb;
  v_line  jsonb;
  v_items jsonb := '[]'::jsonb;
  v_sub   numeric(10, 2) := 0;
  v_ch    record;
  v_count int := 0;
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
  v_keys  text[] := '{}';
begin
  if p_client_key is null then raise exception 'bad_request'; end if;

  -- повторная отправка того же заказа (плохой интернет, двойное нажатие)
  select * into v_old from public.orders o where o.client_key = p_client_key;
  if found then
    return query select v_old.id, v_old.no, v_old.guest_token, v_old.total, v_old.status, v_old.table_label, v_old.items, v_old.note, v_old.created_at,
                        coalesce(v_old.subtotal, v_old.total), v_old.service, v_old.tax;
    return;
  end if;

  select * into v_tab from public.tables t where t.token = lower(btrim(coalesce(p_table, ''))) and t.active;
  if not found then raise exception 'bad_table'; end if;

  select * into v_set from public.settings where settings.id = 1;
  if not v_set.orders_enabled then raise exception 'orders_off'; end if;
  if not v_set.orders_when_closed and not public.restaurant_open() then raise exception 'closed'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'bad_items'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'bad_items'; end if;
    v_line := public.order_line(v_item, true);
    if (v_line ->> 'key') = any (v_keys) then raise exception 'bad_items'; end if;
    v_keys := v_keys || (v_line ->> 'key');
    v_count := v_count + (v_line ->> 'qty')::int;
    v_sub := v_sub + (v_line ->> 'price')::numeric * (v_line ->> 'qty')::int;
    v_items := v_items || jsonb_build_array(v_line - 'key');
  end loop;
  if v_count > 100 then raise exception 'bad_items'; end if;

  -- защита от спама: не больше 5 заказов со стола за 5 минут и 60 со всего ресторана за минуту
  if (select count(*) from public.orders o where o.table_id = v_tab.id and o.created_at > now() - interval '5 minutes') >= 5
     or (select count(*) from public.orders o where o.created_at > now() - interval '1 minute') >= 60 then
    raise exception 'too_many';
  end if;

  select * into v_ch from public.order_charges(v_sub);
  return query
    insert into public.orders as o (table_id, table_label, items, subtotal, service, tax, total, note, lang, client_key)
    values (v_tab.id, v_tab.label, v_items, v_sub, v_ch.service, v_ch.tax, v_ch.total, left(v_note, 300),
            left(nullif(btrim(coalesce(p_lang, '')), ''), 5), p_client_key)
    returning o.id, o.no, o.guest_token, o.total, o.status, o.table_label, o.items, o.note, o.created_at, o.subtotal, o.service, o.tax;
end $$;

drop function if exists public.get_order(uuid, uuid);
-- ---------- Гость: посмотреть СВОЙ заказ (нужны и номер заказа, и его секрет) ----------
create or replace function public.get_order(p_id uuid, p_token uuid)
returns table (id uuid, no bigint, status text, total numeric, table_label text, items jsonb, note text, created_at timestamptz, updated_at timestamptz, accepted_at timestamptz,
               subtotal numeric, service numeric, tax numeric, paid_at timestamptz, edited_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.no, o.status, o.total, o.table_label, o.items, o.note, o.created_at, o.updated_at, o.accepted_at,
         coalesce(o.subtotal, o.total), o.service, o.tax, o.paid_at, o.edited_at
  from public.orders o
  where o.id = p_id and o.guest_token = p_token and o.created_at > now() - interval '3 days';
$$;

-- ---------- Официант (или владелец): принять новый заказ ----------
-- Принять можно только заказ в статусе «новый». Если два официанта нажмут одновременно,
-- примет первый; второй получит актуальный статус и changed = false.
create or replace function public.accept_order(p_id uuid)
returns table (id uuid, no bigint, status text, accepted_at timestamptz, accepted_by_name text, changed boolean)
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  select coalesce(nullif(s.name, ''), s.email) into v_name from public.staff s where s.user_id = auth.uid();
  return query
    update public.orders o
       set status = 'accepted', accepted_by = auth.uid(), accepted_by_name = v_name
     where o.id = p_id and o.status = 'new'
    returning o.id, o.no, o.status, o.accepted_at, o.accepted_by_name, true;
  if not found then
    return query select o.id, o.no, o.status, o.accepted_at, o.accepted_by_name, false from public.orders o where o.id = p_id;
    if not found then raise exception 'not_found'; end if;
  end if;
end $$;

-- ---------- Владелец: создать сразу N столов (1, 2, 3…) ----------
create or replace function public.create_tables(p_from int, p_to int)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; i int;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if p_from < 1 or p_to > 500 or p_to < p_from or p_to - p_from > 199 then raise exception 'bad_range'; end if;
  for i in p_from..p_to loop
    if not exists (select 1 from public.tables where lower(btrim(label)) = i::text) then
      insert into public.tables (label, sort) values (i::text, i);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- Владелец: новый QR для стола (старый перестанет работать) ----------
create or replace function public.reset_table_token(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.tables set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 20) where id = p_id returning token into v;
  if v is null then raise exception 'not_found'; end if;
  return v;
end $$;

revoke all on function public.table_info(text) from public;
revoke all on function public.place_order(text, jsonb, text, text, uuid) from public;
revoke all on function public.order_charges(numeric) from public;
revoke all on function public.order_line(jsonb, boolean) from public;
revoke all on function public.get_order(uuid, uuid) from public;
revoke all on function public.accept_order(uuid) from public;
revoke all on function public.create_tables(int, int) from public;
revoke all on function public.reset_table_token(uuid) from public;
revoke all on function public.restaurant_open(timestamptz) from public;
grant execute on function public.table_info(text) to anon, authenticated;
grant execute on function public.place_order(text, jsonb, text, text, uuid) to anon, authenticated;
grant execute on function public.get_order(uuid, uuid) to anon, authenticated;
grant execute on function public.accept_order(uuid) to authenticated;
grant execute on function public.restaurant_open(timestamptz) to anon, authenticated;
grant execute on function public.create_tables(int, int) to authenticated;
grant execute on function public.reset_table_token(uuid) to authenticated;

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
    foreach t in array array['dishes', 'categories', 'settings', 'orders', 'tables'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- =====================================================================
--  ЗАЛ: СЧЕТА И ОПЛАТА, ВЫЗОВ ОФИЦИАНТА, ИЗМЕНЕНИЕ ЗАКАЗА, КУХНЯ
--  Официант и владелец: вызовы, счёт стола, оплата, печать.
--  Повар: только свой экран кухни (готовится → готово).
--  Изменить состав заказа может только владелец.
-- =====================================================================

-- ---------- Столы для зала (без секретных кодов QR) ----------
create or replace function public.floor_tables()
returns table (id uuid, label text, active boolean, sort int)
language sql stable security definer set search_path = public as $$
  select t.id, t.label, t.active, t.sort from public.tables t where public.is_staff() order by t.sort, t.label;
$$;

-- ---------- Счета ----------
create table if not exists public.bills (
  id           uuid primary key default gen_random_uuid(),
  no           bigint generated always as identity (start with 1) unique,
  table_id     uuid references public.tables (id) on delete set null,
  table_label  text not null,
  order_ids    uuid[] not null,
  order_nos    bigint[] not null,
  subtotal     numeric(10, 2) not null,
  service      numeric(10, 2) not null default 0,
  tax          numeric(10, 2) not null default 0,
  total        numeric(10, 2) not null,
  method       text not null check (method in ('cash', 'card', 'qr', 'other')),
  paid_at      timestamptz not null default now(),
  paid_by      uuid references auth.users (id) on delete set null,
  paid_by_name text
);
create index if not exists bills_paid_idx on public.bills (paid_at desc);

-- Закрыть счёт стола: все неоплаченные заказы стола (или выбранные) → один счёт, способ оплаты.
create or replace function public.close_bill(p_table uuid, p_method text, p_orders uuid[] default null)
returns setof public.bills language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_nos bigint[]; v_sub numeric; v_srv numeric; v_tax numeric; v_tot numeric; v_label text; v_bill public.bills%rowtype;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if p_method not in ('cash', 'card', 'qr', 'other') then raise exception 'bad_method'; end if;
  perform 1 from public.orders o
    where o.table_id = p_table and o.paid_at is null and o.status <> 'cancelled'
      and (p_orders is null or o.id = any (p_orders))
    for update;
  if exists (select 1 from public.orders o where o.table_id = p_table and o.paid_at is null and o.status = 'new'
             and (p_orders is null or o.id = any (p_orders))) then
    raise exception 'has_new';
  end if;
  select array_agg(o.id order by o.no), array_agg(o.no order by o.no),
         sum(coalesce(o.subtotal, o.total)), sum(o.service), sum(o.tax), sum(o.total), max(o.table_label)
    into v_ids, v_nos, v_sub, v_srv, v_tax, v_tot, v_label
    from public.orders o
   where o.table_id = p_table and o.paid_at is null and o.status <> 'cancelled'
     and (p_orders is null or o.id = any (p_orders));
  if v_ids is null then raise exception 'nothing_to_pay'; end if;
  insert into public.bills (table_id, table_label, order_ids, order_nos, subtotal, service, tax, total, method, paid_by, paid_by_name)
  values (p_table, coalesce((select label from public.tables where id = p_table), v_label), v_ids, v_nos, v_sub, v_srv, v_tax, v_tot, p_method,
          auth.uid(), public.staff_name())
  returning * into v_bill;
  update public.orders set paid_at = v_bill.paid_at, bill_id = v_bill.id where id = any (v_ids);
  -- открытый вызов «принесите счёт» этого стола закрывается сам
  update public.calls set done_at = now(), done_by = auth.uid(), done_by_name = public.staff_name()
   where table_id = p_table and done_at is null and kind = 'bill';
  return next v_bill;
end $$;

-- ---------- Вызов официанта / «принесите счёт» ----------
create table if not exists public.calls (
  id           uuid primary key default gen_random_uuid(),
  table_id     uuid references public.tables (id) on delete cascade,
  table_label  text not null,
  kind         text not null check (kind in ('waiter', 'bill')),
  pay_method   text check (pay_method is null or pay_method in ('cash', 'card', 'qr')),
  created_at   timestamptz not null default now(),
  done_at      timestamptz,
  done_by      uuid references auth.users (id) on delete set null,
  done_by_name text
);
create index if not exists calls_open_idx on public.calls (table_id) where done_at is null;
create index if not exists calls_created_idx on public.calls (created_at desc);

-- Гость: позвать официанта или попросить счёт. Повторное нажатие не создаёт второй вызов.
create or replace function public.call_staff(p_table text, p_kind text, p_method text default null)
returns table (id uuid, kind text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_tab public.tables%rowtype; v_call public.calls%rowtype;
begin
  select * into v_tab from public.tables t where t.token = lower(btrim(coalesce(p_table, ''))) and t.active;
  if not found then raise exception 'bad_table'; end if;
  if p_kind not in ('waiter', 'bill') then raise exception 'bad_request'; end if;
  if p_method is not null and p_method not in ('cash', 'card', 'qr') then raise exception 'bad_request'; end if;
  select * into v_call from public.calls c where c.table_id = v_tab.id and c.kind = p_kind and c.done_at is null;
  if found then
    if p_method is not null and v_call.pay_method is distinct from p_method then
      update public.calls c set pay_method = p_method where c.id = v_call.id;
    end if;
    return query select v_call.id, v_call.kind, v_call.created_at; return;
  end if;
  if (select count(*) from public.calls c where c.table_id = v_tab.id and c.created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'too_many';
  end if;
  return query insert into public.calls as c (table_id, table_label, kind, pay_method)
    values (v_tab.id, v_tab.label, p_kind, case when p_kind = 'bill' then p_method end)
    returning c.id, c.kind, c.created_at;
end $$;

-- Гость: открытые вызовы своего стола (чтобы показать «официант уже идёт»)
create or replace function public.table_calls(p_table text)
returns table (kind text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.kind, c.created_at from public.calls c join public.tables t on t.id = c.table_id
  where t.token = lower(btrim(coalesce(p_table, ''))) and t.active and c.done_at is null;
$$;

-- Официант: вызов выполнен
create or replace function public.done_call(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  update public.calls set done_at = now(), done_by = auth.uid(), done_by_name = public.staff_name()
   where id = p_id and done_at is null;
end $$;

-- ---------- Владелец: изменить состав заказа (убрать блюдо, поменять количество, добавить) ----------
-- Позиции, которые уже были в заказе, сохраняют свою цену; новые — по текущей цене меню.
create or replace function public.edit_order(p_id uuid, p_items jsonb)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_item jsonb; v_line jsonb; v_old jsonb; v_items jsonb := '[]'::jsonb;
        v_sub numeric(10, 2) := 0; v_ch record; v_keys text[] := '{}'; v_key text; v_count int := 0; v_q int;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  select * into v_o from public.orders where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_o.status = 'cancelled' then raise exception 'cancelled'; end if;
  if v_o.paid_at is not null then raise exception 'paid'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'bad_items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'bad_items'; end if;
    -- позиция уже была в заказе: оставляем её снимок и цену, меняется только количество
    v_key := (v_item ->> 'id') || '|' || coalesce((select string_agg(x, ',' order by x) from jsonb_array_elements_text(coalesce(v_item -> 'opts', '[]')) x), '');
    select value into v_old from jsonb_array_elements(v_o.items)
      where (value ->> 'id') || '|' || coalesce((select string_agg((o ->> 'g') || ':' || (o ->> 'c'), ',' order by (o ->> 'g') || ':' || (o ->> 'c')) from jsonb_array_elements(coalesce(value -> 'opts', '[]')) o), '') = v_key
      limit 1;
    begin
      v_q := (v_item ->> 'qty')::int;
    exception when others then raise exception 'bad_items'; end;
    if v_q is null or v_q not between 1 and 50 then raise exception 'bad_items'; end if;
    if v_old is not null then
      v_line := jsonb_set(v_old, '{qty}', to_jsonb(v_q));
    else
      v_line := public.order_line(v_item, false) - 'key';
    end if;
    if v_key = any (v_keys) then raise exception 'bad_items'; end if;
    v_keys := v_keys || v_key;
    v_count := v_count + (v_line ->> 'qty')::int;
    v_sub := v_sub + (v_line ->> 'price')::numeric * (v_line ->> 'qty')::int;
    v_items := v_items || jsonb_build_array(v_line);
    v_old := null;
  end loop;
  if v_count > 100 then raise exception 'bad_items'; end if;
  select * into v_ch from public.order_charges(v_sub);
  return query update public.orders
     set items = v_items, subtotal = v_sub, service = v_ch.service, tax = v_ch.tax, total = v_ch.total,
         edited_at = now(), edited_by_name = public.staff_name()
   where id = p_id returning *;
end $$;

-- ---------- Кухня: «готовится» и «готово» ----------
create or replace function public.kitchen_set(p_id uuid, p_status text)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  if not public.is_kitchen() then raise exception 'forbidden'; end if;
  if p_status not in ('cooking', 'ready') then raise exception 'bad_status'; end if;
  select * into v_o from public.orders where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not (v_o.status = 'accepted' or (v_o.status = 'cooking' and p_status = 'ready')) then
    return query select * from public.orders where id = p_id; return;
  end if;
  return query update public.orders set status = p_status where id = p_id returning *;
end $$;

-- ---------- Права на новые таблицы ----------
alter table public.bills enable row level security;
alter table public.calls enable row level security;
revoke all on public.bills, public.calls from anon, authenticated;
grant select on public.bills, public.calls to authenticated;
drop policy if exists bills_floor_read on public.bills;
create policy bills_floor_read on public.bills for select to authenticated using (public.is_floor());
drop policy if exists calls_floor_read on public.calls;
create policy calls_floor_read on public.calls for select to authenticated using (public.is_floor());

revoke all on function public.floor_tables() from public;
revoke all on function public.close_bill(uuid, text, uuid[]) from public;
revoke all on function public.call_staff(text, text, text) from public;
revoke all on function public.table_calls(text) from public;
revoke all on function public.done_call(uuid) from public;
revoke all on function public.edit_order(uuid, jsonb) from public;
revoke all on function public.kitchen_set(uuid, text) from public;
grant execute on function public.floor_tables() to authenticated;
grant execute on function public.close_bill(uuid, text, uuid[]) to authenticated;
grant execute on function public.call_staff(text, text, text) to anon, authenticated;
grant execute on function public.table_calls(text) to anon, authenticated;
grant execute on function public.done_call(uuid) to authenticated;
grant execute on function public.edit_order(uuid, jsonb) to authenticated;
grant execute on function public.kitchen_set(uuid, text) to authenticated;

-- =====================================================================
--  ЖУРНАЛ ИЗМЕНЕНИЙ: кто, когда и что поменял (видит только владелец)
-- =====================================================================
create table if not exists public.audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   uuid,
  who       text,
  entity    text not null,          -- dish / category / settings / table / staff / order / bill
  entity_id text,
  label     text,                   -- название (блюда, стола, №заказа) на момент изменения
  action    text not null,          -- insert / update / delete
  changes   jsonb not null default '{}'  -- { поле: [было, стало] }
);
create index if not exists audit_at_idx on public.audit_log (at desc);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_ent text := tg_argv[0];
  v_skip text[] := array['updated_at', 'status_by', 'guest_token', 'client_key'];
  v_ch jsonb := '{}'::jsonb; k text; v_label text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k = any (v_skip) then continue; end if;
      if (v_old -> k) is distinct from (v_new -> k) then
        -- секретный код стола не пишем в журнал, только факт замены
        if k = 'token' then v_ch := v_ch || jsonb_build_object('token', jsonb_build_array('…', 'новый'));
        else v_ch := v_ch || jsonb_build_object(k, jsonb_build_array(v_old -> k, v_new -> k)); end if;
      end if;
    end loop;
    if v_ch = '{}'::jsonb then return null; end if;
  elsif tg_op = 'INSERT' then
    v_ch := v_new - array['token', 'guest_token', 'client_key'];
  else
    v_ch := v_old - array['token', 'guest_token', 'client_key'];
  end if;
  v_label := case v_ent
    when 'dish' then coalesce(v_row -> 'name' ->> 'ru', v_row -> 'name' ->> 'en')
    when 'category' then coalesce(v_row -> 'name' ->> 'ru', v_row -> 'name' ->> 'en')
    when 'table' then v_row ->> 'label'
    when 'staff' then coalesce(nullif(v_row ->> 'name', ''), v_row ->> 'email')
    when 'order' then '№' || (v_row ->> 'no') || ' · стол ' || (v_row ->> 'table_label')
    when 'bill' then 'счёт №' || (v_row ->> 'no') || ' · стол ' || (v_row ->> 'table_label')
    else null end;
  insert into public.audit_log (user_id, who, entity, entity_id, label, action, changes)
  values (auth.uid(), public.staff_name(), v_ent,
          coalesce(v_row ->> 'id', v_row ->> 'user_id'), v_label, lower(tg_op), v_ch);
  -- старше года — удаляем понемногу
  if random() < 0.01 then delete from public.audit_log where at < now() - interval '365 days'; end if;
  return null;
end $$;

drop trigger if exists audit_dishes on public.dishes;
create trigger audit_dishes after insert or update or delete on public.dishes for each row execute function public.audit_row('dish');
drop trigger if exists audit_categories on public.categories;
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row('category');
drop trigger if exists audit_settings on public.settings;
create trigger audit_settings after update on public.settings for each row execute function public.audit_row('settings');
drop trigger if exists audit_tables on public.tables;
create trigger audit_tables after insert or update or delete on public.tables for each row execute function public.audit_row('table');
drop trigger if exists audit_staff on public.staff;
create trigger audit_staff after insert or update or delete on public.staff for each row execute function public.audit_row('staff');
-- заказы: только изменения сотрудниками (новые заказы гостей в журнал не пишем — они в «Заказах»)
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after update or delete on public.orders for each row execute function public.audit_row('order');
drop trigger if exists audit_bills on public.bills;
create trigger audit_bills after insert on public.bills for each row execute function public.audit_row('bill');

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists audit_owner_read on public.audit_log;
create policy audit_owner_read on public.audit_log for select to authenticated using (public.is_owner());
revoke all on function public.audit_row() from public;

-- =====================================================================
--  TELEGRAM: новые заказы и вызовы приходят владельцу в Telegram
--  Токен бота хранится в закрытой схеме private: его не видит ни гость,
--  ни официант, ни сам сайт — только сервер, когда отправляет сообщение.
-- =====================================================================
do $$ begin
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice 'pg_net недоступен — Telegram выключен (это нормально для локальных тестов)';
  end;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.telegram (
  id            int primary key default 1 check (id = 1),
  bot_token     text,
  chat_ids      text[] not null default '{}',
  notify_orders boolean not null default true,
  notify_calls  boolean not null default true,
  notify_bills  boolean not null default false,
  updated_at    timestamptz not null default now()
);
insert into private.telegram (id) values (1) on conflict (id) do nothing;

create or replace function public.tg_money(p numeric)
returns text language sql stable security definer set search_path = public as $$
  select case when s.currency_before then s.currency || ' ' || trim(to_char(p, 'FM999999990.00')) else trim(to_char(p, 'FM999999990.00')) || ' ' || s.currency end
  from public.settings s where s.id = 1;
$$;

-- Отправить сообщение во все подключённые чаты. Никогда не ломает заказ: любая ошибка — молча.
create or replace function private.tg_send(p_text text)
returns int language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype; c text; n int := 0;
begin
  select * into v from private.telegram where id = 1;
  if v.bot_token is null or cardinality(v.chat_ids) = 0 then return 0; end if;
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return 0; end if;
  foreach c in array v.chat_ids loop
    begin
      execute 'select net.http_post(url := $1, body := $2, headers := $3, params := $4, timeout_milliseconds := $5)'
        using 'https://api.telegram.org/bot' || v.bot_token || '/sendMessage',
              jsonb_build_object('chat_id', c, 'text', left(p_text, 3900), 'disable_web_page_preview', true),
              '{"Content-Type": "application/json"}'::jsonb, '{}'::jsonb, 5000;
      n := n + 1;
    exception when others then null;
    end;
  end loop;
  return n;
end $$;

create or replace function public.tg_on_order()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype; v_lines text;
begin
  begin
    select * into v from private.telegram where id = 1;
    if not coalesce(v.notify_orders, false) then return null; end if;
    select string_agg((i ->> 'qty') || '× ' || coalesce(i -> 'name' ->> 'ru', i -> 'name' ->> 'en', i ->> 'id')
             || coalesce(' (' || (select string_agg(coalesce(o -> 'name' ->> 'ru', o -> 'name' ->> 'en'), ', ') from jsonb_array_elements(coalesce(i -> 'opts', '[]')) o) || ')', ''), E'\n')
      into v_lines from jsonb_array_elements(new.items) i;
    perform private.tg_send('Новый заказ №' || new.no || ' · стол ' || new.table_label || E'\n' || coalesce(v_lines, '')
      || coalesce(E'\nКомментарий: ' || new.note, '') || E'\nИтого: ' || public.tg_money(new.total));
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_orders on public.orders;
create trigger tg_orders after insert on public.orders for each row execute function public.tg_on_order();

create or replace function public.tg_on_call()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype;
begin
  begin
    select * into v from private.telegram where id = 1;
    if not coalesce(v.notify_calls, false) then return null; end if;
    perform private.tg_send('Стол ' || new.table_label || ': ' || case when new.kind = 'bill'
      then 'просят счёт' || coalesce(' (' || case new.pay_method when 'cash' then 'наличные' when 'card' then 'карта' else 'QR' end || ')', '')
      else 'зовут официанта' end);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_calls on public.calls;
create trigger tg_calls after insert on public.calls for each row execute function public.tg_on_call();

create or replace function public.tg_on_bill()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype;
begin
  begin
    select * into v from private.telegram where id = 1;
    if not coalesce(v.notify_bills, false) then return null; end if;
    perform private.tg_send('Оплачен счёт №' || new.no || ' · стол ' || new.table_label || ': ' || public.tg_money(new.total) || ' · '
      || case new.method when 'cash' then 'наличные' when 'card' then 'карта' when 'qr' then 'QR' else 'другое' end
      || coalesce(' · ' || new.paid_by_name, ''));
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_bills on public.bills;
create trigger tg_bills after insert on public.bills for each row execute function public.tg_on_bill();

-- Владелец: состояние Telegram (сам токен наружу не отдаётся — только последние символы)
create or replace function public.telegram_status()
returns table (connected boolean, bot_hint text, chats int, notify_orders boolean, notify_calls boolean, notify_bills boolean, net_ok boolean)
language plpgsql stable security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  return query select t.bot_token is not null and cardinality(t.chat_ids) > 0,
    case when t.bot_token is null then null else '…' || right(t.bot_token, 4) end,
    cardinality(t.chat_ids), t.notify_orders, t.notify_calls, t.notify_bills,
    to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null
  from private.telegram t where t.id = 1;
end $$;

-- Владелец: подключить бота. p_token = null — оставить прежний токен (меняются чаты и галочки).
create or replace function public.set_telegram(p_token text, p_chats text[], p_orders boolean, p_calls boolean, p_bills boolean)
returns void language plpgsql security definer set search_path = public, private as $$
declare c text;
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  if p_token is not null and btrim(p_token) !~ '^[0-9]{5,15}:[A-Za-z0-9_-]{30,60}$' then raise exception 'bad_token'; end if;
  if p_chats is null or cardinality(p_chats) > 5 then raise exception 'bad_chat'; end if;
  foreach c in array p_chats loop
    if c !~ '^-?[0-9]{3,20}$' then raise exception 'bad_chat'; end if;
  end loop;
  update private.telegram set
    bot_token = coalesce(btrim(p_token), bot_token), chat_ids = p_chats,
    notify_orders = coalesce(p_orders, true), notify_calls = coalesce(p_calls, true), notify_bills = coalesce(p_bills, false),
    updated_at = now()
  where id = 1;
end $$;

create or replace function public.clear_telegram()
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update private.telegram set bot_token = null, chat_ids = '{}', updated_at = now() where id = 1;
end $$;

create or replace function public.telegram_test()
returns int language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  return private.tg_send('Проверка: уведомления из меню ' || coalesce((select name from public.settings where id = 1), '') || ' подключены.');
end $$;

revoke all on function private.tg_send(text) from public;
revoke all on function public.tg_money(numeric) from public;
revoke all on function public.tg_on_order() from public;
revoke all on function public.tg_on_call() from public;
revoke all on function public.tg_on_bill() from public;
revoke all on function public.telegram_status() from public;
revoke all on function public.set_telegram(text, text[], boolean, boolean, boolean) from public;
revoke all on function public.clear_telegram() from public;
revoke all on function public.telegram_test() from public;
grant execute on function public.telegram_status() to authenticated;
grant execute on function public.set_telegram(text, text[], boolean, boolean, boolean) to authenticated;
grant execute on function public.clear_telegram() to authenticated;
grant execute on function public.telegram_test() to authenticated;

-- живые обновления для вызовов и счетов
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['calls', 'bills'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
