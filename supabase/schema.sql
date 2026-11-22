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
alter table public.staff add constraint staff_role_check check (role in ('waiter', 'owner', 'cook', 'manager', 'courier'));

create table if not exists public.staff_invites (
  email      text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role       text not null default 'waiter',
  name       text not null default '' check (char_length(name) <= 60),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check check (role in ('waiter', 'owner', 'cook', 'manager', 'courier'));

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

-- Менеджер (старший смены) или владелец: отмена оплаты, скидки, закрытие дня, отчёты, правка заказов.
-- Меню, столы, настройки, сотрудники, Telegram и журнал — только владелец.
create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.staff s join auth.users u on u.id = s.user_id
    where s.user_id = auth.uid() and s.active and s.role in ('owner', 'manager') and u.email_confirmed_at is not null);
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
  select coalesce(public.staff_role() in ('waiter', 'owner', 'manager'), false);
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
  default_language text not null default 'en' check (default_language in ('ru', 'uz', 'en', 'ar', 'ms', 'zh')),
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
-- реквизиты для чека: юр. название, SSM, номер SST — печатаются под названием, до 5 строк
-- округление наличных до 5 сен (правило Малайзии); официанты могут давать скидку (иначе — только владелец)
alter table public.settings add column if not exists cash_rounding boolean not null default true;
alter table public.settings add column if not exists waiter_discounts boolean not null default false;
alter table public.settings add column if not exists receipt_info text not null default '' check (char_length(receipt_info) <= 300);
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
-- время подачи категории (например «Завтрак» 06:00–11:00); пусто — весь день. Конец может быть после полуночи.
alter table public.categories add column if not exists avail_from text;
alter table public.categories add column if not exists avail_to text;
alter table public.categories drop constraint if exists categories_avail_check;
alter table public.categories add constraint categories_avail_check check (
  (avail_from is null) = (avail_to is null)
  and (avail_from is null or (avail_from ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and avail_to ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and avail_from <> avail_to)));
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
alter table public.dishes add column if not exists prep_min int check (prep_min is null or prep_min between 1 and 240);  -- время готовки, мин
alter table public.dishes add column if not exists pairs text[] not null default '{}';  -- «С этим берут»: коды других блюд
alter table public.dishes drop constraint if exists dishes_pairs_check;
alter table public.dishes add constraint dishes_pairs_check check (cardinality(pairs) <= 6);
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
  if p_role not in ('waiter', 'owner', 'cook', 'manager', 'courier') then raise exception 'bad_role'; end if;
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
  if p_role not in ('waiter', 'owner', 'cook', 'manager', 'courier') then raise exception 'bad_role'; end if;
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
grant execute on function public.is_manager() to authenticated;
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
alter table public.orders add column if not exists served_at timestamptz;
-- кто принёс заказ на стол (нажал «Подано» или закрыл счёт)
alter table public.orders add column if not exists served_by uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists served_by_name text;
alter table public.orders add column if not exists source text not null default 'guest';
alter table public.orders add column if not exists created_by_name text;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('new', 'accepted', 'cooking', 'ready', 'on_the_way', 'served', 'cancelled'));
-- заказ на стол (по QR) или доставка домой; у доставки «served» = доставлено
alter table public.orders add column if not exists kind text not null default 'table';
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('table', 'delivery'));
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check check (source in ('guest', 'staff'));
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_table_created_idx on public.orders (table_id, created_at desc);
drop index if exists public.orders_active_idx;
create index if not exists orders_active_idx on public.orders (status) where status in ('new', 'accepted', 'cooking', 'ready', 'on_the_way', 'served');

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
    -- оплаченный заказ больше не меняет статус (иначе счёт и отчёты разойдутся)
    if old.paid_at is not null then raise exception 'paid'; end if;
    if new.status = 'served' then
      if new.served_at is null then new.served_at := now(); end if;
      new.served_by := coalesce(new.served_by, auth.uid());
    elsif old.status = 'served' then
      -- вернули в «ждёт подачи» — время и «кто подал» запишутся заново
      new.served_at := null; new.served_by := null; new.served_by_name := null;
    end if;
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

-- ---------- Подаётся ли категория сейчас (по часам категории и часовому поясу ресторана) ----------
create or replace function public.category_open(p_from text, p_to text, p_at timestamptz default now())
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_tz text; m int; f int; t int;
begin
  if p_from is null or p_to is null then return true; end if;
  select timezone into v_tz from public.settings where id = 1;
  m := extract(hour from (p_at at time zone v_tz))::int * 60 + extract(minute from (p_at at time zone v_tz))::int;
  f := public.hm(p_from); t := public.hm(p_to);
  if t > f then return m >= f and m < t; end if;
  return m >= f or m < t;   -- через полночь
end $$;
revoke all on function public.category_open(text, text, timestamptz) from public;
grant execute on function public.category_open(text, text, timestamptz) to anon, authenticated;

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
create policy orders_staff_read on public.orders for select to authenticated
  using (public.is_staff() and (public.staff_role() <> 'courier' or kind = 'delivery'));   -- курьер видит только доставку
drop policy if exists orders_owner_status on public.orders;
create policy orders_owner_status on public.orders for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- ---------- Гость: проверить стол по коду из QR ----------
-- ---------- Wi‑Fi для гостей ----------
-- Пароль не лежит в открытых настройках: его видит только гость за столом (через QR), владелец меняет.
create table if not exists public.wifi (
  id   int primary key default 1 check (id = 1),
  name text not null default '' check (char_length(name) <= 64),
  pass text not null default '' check (char_length(pass) <= 64)
);
insert into public.wifi (id) values (1) on conflict (id) do nothing;
alter table public.wifi enable row level security;
revoke all on public.wifi from anon, authenticated;
grant select, update (name, pass) on public.wifi to authenticated;
drop policy if exists wifi_owner_read on public.wifi;
create policy wifi_owner_read on public.wifi for select to authenticated using (public.is_owner());
drop policy if exists wifi_owner_upd on public.wifi;
create policy wifi_owner_upd on public.wifi for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- гость за столом: номер стола и Wi‑Fi ресторана
drop function if exists public.table_info(text);
create or replace function public.table_info(p_token text)
returns table (label text, wifi_name text, wifi_pass text) language sql stable security definer set search_path = public as $$
  select t.label, nullif(w.name, ''), nullif(w.pass, '')
  from public.tables t left join public.wifi w on w.id = 1
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

-- ---------- Акция, блюдо дня, остатки (2026-11-21) ----------
-- promo_price — цена по акции (меньше обычной); promo_from/promo_to — часы акции («счастливые часы»), пусто = весь день.
alter table public.dishes add column if not exists promo_price numeric(10, 2);
alter table public.dishes add column if not exists promo_from text;
alter table public.dishes add column if not exists promo_to text;
alter table public.dishes add column if not exists featured boolean not null default false;  -- «Блюдо дня»
alter table public.dishes add column if not exists stock int;                                -- осталось порций; пусто = не считаем
alter table public.dishes drop constraint if exists dishes_promo_check;
alter table public.dishes add constraint dishes_promo_check check (
  (promo_price is null or (promo_price >= 0 and promo_price < price))
  and (promo_from is null) = (promo_to is null)
  and (promo_from is null or (promo_price is not null and promo_from ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       and promo_to ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and promo_from <> promo_to)));
alter table public.dishes drop constraint if exists dishes_stock_check;
alter table public.dishes add constraint dishes_stock_check check (stock is null or stock between 0 and 100000);

create or replace function public.dish_price(d public.dishes, p_at timestamptz default now())
returns numeric language sql stable security definer set search_path = public as $$
  select case when d.promo_price is not null and public.category_open(d.promo_from, d.promo_to, p_at) then d.promo_price else d.price end;
$$;

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
  -- пожелание гостя к этому блюду («без лука», «поменьше соли»): одна строка, до 120 символов
  v_note text := left(nullif(btrim(regexp_replace(coalesce(p_item ->> 'note', ''), '[[:space:]]+', ' ', 'g')), ''), 120);
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
  if not found or not v_dish.available or v_dish.stock = 0 then raise exception 'unavailable:%', v_id; end if;
  -- блюдо из категории со временем подачи (например, завтрак) — только в эти часы
  if not public.category_open((select avail_from from public.categories where id = v_dish.category_id),
                              (select avail_to from public.categories where id = v_dish.category_id)) then
    raise exception 'not_now:%', v_id;
  end if;

  v_unit := public.dish_price(v_dish);   -- цена по акции, если она сейчас идёт
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

  -- одно и то же блюдо с разными пожеланиями — разные строки заказа
  return jsonb_build_object('id', v_id, 'qty', v_qty, 'price', v_unit, 'name', v_dish.name, 'opts', v_snap,
                            'key', v_id || '|' || array_to_string(v_sel, ',') || '|' || coalesce(v_note, ''))
         || case when v_note is null then '{}'::jsonb else jsonb_build_object('note', v_note) end;
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
-- Мои столы: кто из официантов обслуживает стол (один официант на стол)
create table if not exists public.table_waiters (
  table_id uuid primary key references public.tables (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  since    timestamptz not null default now()
);
drop function if exists public.floor_tables();
create or replace function public.floor_tables()
returns table (id uuid, label text, active boolean, sort int, waiter_id uuid, waiter_name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.label, t.active, t.sort, w.user_id, coalesce(nullif(s.name, ''), s.email)
  from public.tables t
  left join public.table_waiters w on w.table_id = t.id
  left join public.staff s on s.user_id = w.user_id
  where public.is_staff() order by t.sort, t.label;
$$;

-- Официант: взять стол себе / отпустить. Если стол был у другого — переходит к вам.
create or replace function public.claim_table(p_table uuid, p_claim boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.tables where id = p_table) then raise exception 'not_found'; end if;
  if p_claim then
    insert into public.table_waiters (table_id, user_id) values (p_table, auth.uid())
    on conflict (table_id) do update set user_id = excluded.user_id, since = now();
  else
    delete from public.table_waiters where table_id = p_table and (user_id = auth.uid() or public.is_owner());
  end if;
end $$;

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
  method       text not null,
  paid_at      timestamptz not null default now(),
  paid_by      uuid references auth.users (id) on delete set null,
  paid_by_name text
);
create index if not exists bills_paid_idx on public.bills (paid_at desc);
alter table public.bills add column if not exists tip numeric(10, 2) not null default 0 check (tip >= 0);
alter table public.bills add column if not exists payments jsonb not null default '[]';   -- [{ method, amount }] — раздельная оплата
alter table public.bills drop constraint if exists bills_method_check;
alter table public.bills add constraint bills_method_check check (method in ('cash', 'card', 'qr', 'other', 'mixed'));
-- скидка на счёт (с блюд; сбор и налог пересчитаны с суммы после скидки) и округление наличных
alter table public.bills add column if not exists discount numeric(10, 2) not null default 0 check (discount >= 0);
alter table public.bills add column if not exists discount_pct numeric(5, 2);
alter table public.bills add column if not exists discount_reason text;
alter table public.bills add column if not exists discount_by_name text;
alter table public.bills add column if not exists rounding numeric(10, 2) not null default 0;

-- Закрыть счёт стола: все неоплаченные заказы стола (или выбранные) → один счёт.
-- p_tip — чаевые; p_payments — раздельная оплата [{ method, amount }], сумма = к оплате + чаевые.
drop function if exists public.close_bill(uuid, text, uuid[]);
drop function if exists public.close_bill(uuid, text, uuid[], numeric, jsonb);
-- p_discount: { "kind": "pct" | "amount", "value": 10, "reason": "Постоянный гость" } — скидка на блюда
create or replace function public.close_bill(p_table uuid, p_method text, p_orders uuid[] default null,
                                             p_tip numeric default 0, p_payments jsonb default null, p_discount jsonb default null)
returns setof public.bills language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_nos bigint[]; v_sub numeric; v_srv numeric; v_tax numeric; v_tot numeric; v_label text; v_bill public.bills%rowtype;
        v_tip numeric(10, 2) := round(coalesce(p_tip, 0), 2); v_pay jsonb := '[]'::jsonb; v_sum numeric := 0; v_methods text[] := '{}'; x jsonb; v_m text;
        v_set public.settings%rowtype; v_disc numeric(10, 2) := 0; v_dpct numeric(5, 2); v_dreason text; v_kind text; v_val numeric;
        v_round numeric(10, 2) := 0; v_cash numeric := 0; v_noncash numeric := 0; v_due numeric;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if p_method not in ('cash', 'card', 'qr', 'other', 'mixed') then raise exception 'bad_method'; end if;
  if v_tip < 0 or v_tip > 100000 then raise exception 'bad_tip'; end if;
  -- закрытие дня ждёт, пока идут оплаты (и наоборот): счёт не потеряется между двумя Z-отчётами
  perform pg_advisory_xact_lock_shared(hashtext('restoran_z_report'));
  perform 1 from public.orders o
    where o.table_id = p_table and o.paid_at is null and o.status <> 'cancelled'
      and (p_orders is null or o.id = any (p_orders))
    for update;
  select array_agg(o.id order by o.no), array_agg(o.no order by o.no),
         sum(coalesce(o.subtotal, o.total)), sum(o.service), sum(o.tax), sum(o.total), max(o.table_label)
    into v_ids, v_nos, v_sub, v_srv, v_tax, v_tot, v_label
    from public.orders o
   where o.table_id = p_table and o.paid_at is null and o.status <> 'cancelled'
     and (p_orders is null or o.id = any (p_orders));
  if v_ids is null then raise exception 'nothing_to_pay'; end if;
  select * into v_set from public.settings where id = 1;
  -- скидка: владелец всегда, официант — если владелец разрешил; причина обязательна
  if p_discount is not null and jsonb_typeof(p_discount) = 'object' then
    if not (public.is_manager() or coalesce(v_set.waiter_discounts, false)) then raise exception 'no_discount_rights'; end if;
    v_kind := p_discount ->> 'kind';
    v_dreason := left(nullif(btrim(coalesce(p_discount ->> 'reason', '')), ''), 100);
    if v_dreason is null then raise exception 'discount_reason'; end if;
    begin v_val := (p_discount ->> 'value')::numeric; exception when others then raise exception 'bad_discount'; end;
    if v_kind = 'pct' then
      if v_val is null or v_val <= 0 or v_val > 100 then raise exception 'bad_discount'; end if;
      v_dpct := round(v_val, 2);
      v_disc := round(v_sub * v_dpct / 100, 2);
    elsif v_kind = 'amount' then
      if v_val is null or v_val <= 0 or round(v_val, 2) > v_sub then raise exception 'bad_discount'; end if;
      v_disc := round(v_val, 2);
    else
      raise exception 'bad_discount';
    end if;
    -- сбор и налог — с суммы после скидки (пропорционально)
    if v_sub > 0 then
      v_srv := round(v_srv * (v_sub - v_disc) / v_sub, 2);
      v_tax := round(v_tax * (v_sub - v_disc) / v_sub, 2);
    end if;
    v_tot := v_sub - v_disc + v_srv + v_tax;
  end if;
  -- оплата: один способ на всю сумму или несколько частей.
  -- Наличные округляются до 5 сен (1–2 сен вниз, 3–4 вверх, 6–7 вниз, 8–9 вверх), если включено.
  if p_payments is null then
    if p_method = 'mixed' then raise exception 'bad_payments'; end if;
    v_due := v_tot + v_tip;
    if p_method = 'cash' and coalesce(v_set.cash_rounding, true) then v_round := round(v_due * 20) / 20 - v_due; end if;
    v_pay := jsonb_build_array(jsonb_build_object('method', p_method, 'amount', v_due + v_round));
    v_methods := array[p_method];
  else
    if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) not between 1 and 4 then raise exception 'bad_payments'; end if;
    for x in select value from jsonb_array_elements(p_payments) loop
      v_m := x ->> 'method';
      if v_m not in ('cash', 'card', 'qr', 'other') or jsonb_typeof(x -> 'amount') <> 'number' or (x ->> 'amount')::numeric <= 0 then raise exception 'bad_payments'; end if;
      v_sum := v_sum + round((x ->> 'amount')::numeric, 2);
      if v_m = 'cash' then v_cash := v_cash + round((x ->> 'amount')::numeric, 2); else v_noncash := v_noncash + round((x ->> 'amount')::numeric, 2); end if;
      v_pay := v_pay || jsonb_build_array(jsonb_build_object('method', v_m, 'amount', round((x ->> 'amount')::numeric, 2)));
      if not v_m = any (v_methods) then v_methods := v_methods || v_m; end if;
    end loop;
    -- округляется только наличная часть: всё, что не картой/QR, — до 5 сен
    if v_cash > 0 and coalesce(v_set.cash_rounding, true) then
      v_due := v_tot + v_tip - v_noncash;
      v_round := round(v_due * 20) / 20 - v_due;
    end if;
    if abs(v_sum - (v_tot + v_tip + v_round)) > 0.01 then raise exception 'bad_payments'; end if;
  end if;
  insert into public.bills (table_id, table_label, order_ids, order_nos, subtotal, service, tax, total, tip, payments, method, paid_by, paid_by_name,
                            discount, discount_pct, discount_reason, discount_by_name, rounding, paid_at)
  values (p_table, coalesce((select label from public.tables where id = p_table), v_label), v_ids, v_nos, v_sub, v_srv, v_tax, v_tot, v_tip, v_pay,
          case when cardinality(v_methods) = 1 then v_methods[1] else 'mixed' end, auth.uid(), public.staff_name(),
          v_disc, v_dpct, case when v_disc > 0 then v_dreason end, case when v_disc > 0 then public.staff_name() end, v_round, clock_timestamp())
  returning * into v_bill;
  -- оплаченный заказ точно на столе: если «Подано» забыли нажать — отмечаем сами
  update public.orders
     set paid_at = v_bill.paid_at, bill_id = v_bill.id,
         status = case when status in ('new', 'accepted', 'cooking', 'ready') then 'served' else status end,
         served_by_name = case when status in ('new', 'accepted', 'cooking', 'ready') then public.staff_name() else served_by_name end
   where id = any (v_ids);
  -- открытый вызов «принесите счёт» этого стола закрывается сам
  update public.calls set done_at = now(), done_by = auth.uid(), done_by_name = public.staff_name()
   where table_id = p_table and done_at is null and kind = 'bill';
  return next v_bill;
end $$;

-- ---------- Официант (или владелец): заказ за гостя ----------
-- Сразу «принят» этим официантом и идёт на кухню. Цены — по меню на сервере.
create or replace function public.staff_place_order(p_table uuid, p_items jsonb, p_note text, p_client_key uuid)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_tab public.tables%rowtype; v_item jsonb; v_line jsonb; v_items jsonb := '[]'::jsonb; v_sub numeric(10, 2) := 0;
        v_ch record; v_keys text[] := '{}'; v_count int := 0; v_name text;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if p_client_key is null then raise exception 'bad_request'; end if;
  if exists (select 1 from public.orders where client_key = p_client_key) then
    return query select * from public.orders where client_key = p_client_key; return;
  end if;
  select * into v_tab from public.tables where id = p_table and active;
  if not found then raise exception 'bad_table'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'bad_items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'bad_items'; end if;
    v_line := public.order_line(v_item, false);
    if (v_line ->> 'key') = any (v_keys) then raise exception 'bad_items'; end if;
    v_keys := v_keys || (v_line ->> 'key');
    v_count := v_count + (v_line ->> 'qty')::int;
    v_sub := v_sub + (v_line ->> 'price')::numeric * (v_line ->> 'qty')::int;
    v_items := v_items || jsonb_build_array(v_line - 'key');
  end loop;
  if v_count > 100 then raise exception 'bad_items'; end if;
  select * into v_ch from public.order_charges(v_sub);
  v_name := public.staff_name();
  return query insert into public.orders as o (table_id, table_label, items, subtotal, service, tax, total, note, lang, client_key,
                                               status, accepted_at, accepted_by, accepted_by_name, source, created_by_name)
    values (v_tab.id, v_tab.label, v_items, v_sub, v_ch.service, v_ch.tax, v_ch.total,
            left(nullif(btrim(coalesce(p_note, '')), ''), 300), null, p_client_key,
            'accepted', now(), auth.uid(), v_name, 'staff', v_name)
    returning o.*;
end $$;

-- ---------- Официант: заказ отнесли гостю ----------
-- В ресторане всё просто: пришёл заказ → официант принёс → «Подано».
-- Подать можно и новый заказ (без «принять/готовится/готово»).
create or replace function public.serve_order(p_id uuid)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_name text;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  select * into v_o from public.orders where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_o.status in ('new', 'accepted', 'cooking', 'ready') then
    select coalesce(nullif(st.name, ''), st.email) into v_name from public.staff st where st.user_id = auth.uid();
    return query update public.orders
       set status = 'served', served_by = auth.uid(), served_by_name = v_name
     where id = p_id returning *;
    return;
  end if;
  return query select * from public.orders where id = p_id;
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
-- просьба гостя к официанту: вода, салфетки, приборы, лёд, убрать со стола (пусто — просто подойти)
alter table public.calls add column if not exists reason text;
alter table public.calls drop constraint if exists calls_reason_check;
alter table public.calls add constraint calls_reason_check check (reason is null or reason in ('water', 'napkins', 'cutlery', 'ice', 'clear'));
create index if not exists calls_created_idx on public.calls (created_at desc);

-- Гость: позвать официанта или попросить счёт. Повторное нажатие не создаёт второй вызов.
drop function if exists public.call_staff(text, text, text);
create or replace function public.call_staff(p_table text, p_kind text, p_method text default null, p_reason text default null)
returns table (id uuid, kind text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_tab public.tables%rowtype; v_call public.calls%rowtype;
begin
  select * into v_tab from public.tables t where t.token = lower(btrim(coalesce(p_table, ''))) and t.active;
  if not found then raise exception 'bad_table'; end if;
  if p_kind not in ('waiter', 'bill') then raise exception 'bad_request'; end if;
  if p_method is not null and p_method not in ('cash', 'card', 'qr') then raise exception 'bad_request'; end if;
  if p_reason is not null and (p_kind <> 'waiter' or p_reason not in ('water', 'napkins', 'cutlery', 'ice', 'clear')) then raise exception 'bad_request'; end if;
  select * into v_call from public.calls c where c.table_id = v_tab.id and c.kind = p_kind and c.done_at is null
    and coalesce(c.reason, '') = coalesce(p_reason, '');
  if found then
    if p_method is not null and v_call.pay_method is distinct from p_method then
      update public.calls c set pay_method = p_method where c.id = v_call.id;
    end if;
    return query select v_call.id, v_call.kind, v_call.created_at; return;
  end if;
  if (select count(*) from public.calls c where c.table_id = v_tab.id and c.created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'too_many';
  end if;
  return query insert into public.calls as c (table_id, table_label, kind, pay_method, reason)
    values (v_tab.id, v_tab.label, p_kind, case when p_kind = 'bill' then p_method end, case when p_kind = 'waiter' then p_reason end)
    returning c.id, c.kind, c.created_at;
end $$;

-- Гость: открытые вызовы своего стола (чтобы показать «официант уже идёт»)
drop function if exists public.table_calls(text);
create or replace function public.table_calls(p_table text)
returns table (kind text, created_at timestamptz, reason text)
language sql stable security definer set search_path = public as $$
  select c.kind, c.created_at, c.reason from public.calls c join public.tables t on t.id = c.table_id
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
  if not public.is_manager() then raise exception 'forbidden'; end if;
  select * into v_o from public.orders where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_o.status = 'cancelled' then raise exception 'cancelled'; end if;
  if v_o.paid_at is not null then raise exception 'paid'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'bad_items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'bad_items'; end if;
    -- позиция уже была в заказе: оставляем её снимок и цену, меняется только количество
    -- строка = блюдо + варианты + пожелание гостя («без лука»): один плов с пожеланием и один без — разные строки
    v_key := (v_item ->> 'id') || '|' || coalesce((select string_agg(x, ',' order by x) from jsonb_array_elements_text(coalesce(v_item -> 'opts', '[]')) x), '')
             || '|' || coalesce(left(nullif(btrim(regexp_replace(coalesce(v_item ->> 'note', ''), '[[:space:]]+', ' ', 'g')), ''), 120), '');
    select value into v_old from jsonb_array_elements(v_o.items)
      where (value ->> 'id') || '|' || coalesce((select string_agg((o ->> 'g') || ':' || (o ->> 'c'), ',' order by (o ->> 'g') || ':' || (o ->> 'c')) from jsonb_array_elements(coalesce(value -> 'opts', '[]')) o), '')
            || '|' || coalesce(value ->> 'note', '') = v_key
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
  -- повару — что заказ поменяли (если заказ ещё не подан)
  if v_o.status in ('new', 'accepted', 'cooking', 'ready') then
    begin
      perform private.tg_send_to(private.tg_cook_chats(), 'Изменён заказ №' || v_o.no || ' · стол ' || v_o.table_label || E'\n' || coalesce(public.tg_lines(v_items), ''));
    exception when others then null;
    end;
  end if;
  -- доставка: без сервисного сбора, стоимость доставки остаётся как была
  if v_o.kind = 'delivery' then
    v_ch := null;
    select 0::numeric as service, round(v_sub * coalesce(st.tax_pct, 0) / 100, 2) as tax,
           (v_sub + round(v_sub * coalesce(st.tax_pct, 0) / 100, 2) + v_o.delivery_fee)::numeric(10, 2) as total
      into v_ch from public.settings st where st.id = 1;
  end if;
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
alter table public.table_waiters enable row level security;
revoke all on public.table_waiters from anon, authenticated;
grant select on public.table_waiters to authenticated;
drop policy if exists table_waiters_staff_read on public.table_waiters;
create policy table_waiters_staff_read on public.table_waiters for select to authenticated using (public.is_staff());
revoke all on public.bills, public.calls from anon, authenticated;
grant select on public.bills, public.calls to authenticated;
drop policy if exists bills_floor_read on public.bills;
create policy bills_floor_read on public.bills for select to authenticated using (public.is_floor());
drop policy if exists calls_floor_read on public.calls;
create policy calls_floor_read on public.calls for select to authenticated using (public.is_floor());

revoke all on function public.floor_tables() from public;
revoke all on function public.close_bill(uuid, text, uuid[], numeric, jsonb, jsonb) from public;
revoke all on function public.claim_table(uuid, boolean) from public;
revoke all on function public.staff_place_order(uuid, jsonb, text, uuid) from public;
revoke all on function public.serve_order(uuid) from public;
revoke all on function public.call_staff(text, text, text, text) from public;
revoke all on function public.table_calls(text) from public;
revoke all on function public.done_call(uuid) from public;
revoke all on function public.edit_order(uuid, jsonb) from public;
revoke all on function public.kitchen_set(uuid, text) from public;
grant execute on function public.floor_tables() to authenticated;
grant execute on function public.close_bill(uuid, text, uuid[], numeric, jsonb, jsonb) to authenticated;
grant execute on function public.claim_table(uuid, boolean) to authenticated;
grant execute on function public.staff_place_order(uuid, jsonb, text, uuid) to authenticated;
grant execute on function public.serve_order(uuid) to authenticated;
grant execute on function public.call_staff(text, text, text, text) to anon, authenticated;
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
      -- остатки, которые списал сам заказ, в журнал не пишем (иначе каждый заказ = запись)
      if v_ent = 'dish' and k = 'stock' and coalesce(current_setting('restoran.stock_auto', true), '') = '1' then continue; end if;
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
create trigger audit_bills after insert or update on public.bills for each row execute function public.audit_row('bill');

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
alter table private.telegram add column if not exists bot_username text;
alter table private.telegram add column if not exists getme_req bigint;
-- Telegram сотрудника: свой чат (официант — вызовы и заказы своих столов, повар — заказы на кухню)
create table if not exists private.staff_tg (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  chat_id  text,
  code     text,
  code_at  timestamptz,
  req      bigint
);
alter table private.staff_tg enable row level security;
alter table private.telegram enable row level security;  -- читать могут только функции сервера

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

-- Отправить в конкретные чаты (сотрудникам). Тоже никогда не ломает заказ.
create or replace function private.tg_send_to(p_chats text[], p_text text)
returns int language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype; c text; n int := 0;
begin
  select * into v from private.telegram where id = 1;
  if v.bot_token is null or p_chats is null or cardinality(p_chats) = 0 then return 0; end if;
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return 0; end if;
  foreach c in array p_chats loop
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

-- Чаты официантов этого стола: его официант, а если стол ничей — все официанты с Telegram
create or replace function private.tg_floor_chats(p_table uuid)
returns text[] language sql stable security definer set search_path = public, private as $$
  with own as (
    select g.chat_id from public.table_waiters w join public.staff s on s.user_id = w.user_id and s.active
    join private.staff_tg g on g.user_id = w.user_id
    where w.table_id = p_table and g.chat_id is not null)
  select coalesce(
    (select array_agg(chat_id) from own),
    (select array_agg(g.chat_id) from public.staff s join private.staff_tg g on g.user_id = s.user_id
      where s.active and s.role in ('waiter', 'manager') and g.chat_id is not null and not exists (select 1 from own)),
    '{}');
$$;
create or replace function private.tg_all_waiter_chats()
returns text[] language sql stable security definer set search_path = public, private as $$
  select coalesce(array_agg(g.chat_id), '{}') from public.staff s join private.staff_tg g on g.user_id = s.user_id
  where s.active and s.role in ('waiter', 'manager') and g.chat_id is not null;
$$;
create or replace function private.tg_cook_chats()
returns text[] language sql stable security definer set search_path = public, private as $$
  select coalesce(array_agg(g.chat_id), '{}') from public.staff s join private.staff_tg g on g.user_id = s.user_id
  where s.active and s.role = 'cook' and g.chat_id is not null;
$$;
create or replace function public.tg_lines(p_items jsonb)
returns text language sql immutable as $$
  select string_agg((i ->> 'qty') || '× ' || coalesce(i -> 'name' ->> 'ru', i -> 'name' ->> 'en', i ->> 'id')
           || coalesce(' (' || (select string_agg(coalesce(o -> 'name' ->> 'ru', o -> 'name' ->> 'en'), ', ') from jsonb_array_elements(coalesce(i -> 'opts', '[]')) o) || ')', '')
           || coalesce(E'\n   >> ' || (i ->> 'note'), ''), E'\n')
  from jsonb_array_elements(p_items) i;
$$;

-- статусы заказа: «принят» → повару, «готово» → официанту стола
create or replace function public.tg_on_order_status()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  begin
    -- повар уже получил заказ при создании; «готово» от кухни (старые экраны) — официанту стола
    if new.status = 'ready' and old.status <> 'ready' then
      perform private.tg_send_to(private.tg_floor_chats(new.table_id), 'Готово: заказ №' || new.no || ' · стол ' || new.table_label || ' — отнесите');
    end if;
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_orders_status on public.orders;
create trigger tg_orders_status after update of status on public.orders for each row execute function public.tg_on_order_status();

create or replace function public.tg_on_order()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype; v_lines text;
begin
  begin
    select * into v from private.telegram where id = 1;
    select string_agg((i ->> 'qty') || '× ' || coalesce(i -> 'name' ->> 'ru', i -> 'name' ->> 'en', i ->> 'id')
             || coalesce(' (' || (select string_agg(coalesce(o -> 'name' ->> 'ru', o -> 'name' ->> 'en'), ', ') from jsonb_array_elements(coalesce(i -> 'opts', '[]')) o) || ')', '')
           || coalesce(E'\n   >> ' || (i ->> 'note'), ''), E'\n')
      into v_lines from jsonb_array_elements(new.items) i;
    if coalesce(v.notify_orders, false) then
      perform private.tg_send('Новый заказ №' || new.no || ' · стол ' || new.table_label
        || case when new.source = 'staff' then ' (от официанта ' || coalesce(new.created_by_name, '') || ')' else '' end || E'\n' || coalesce(v_lines, '')
        || coalesce(E'\nКомментарий: ' || new.note, '') || E'\nИтого: ' || public.tg_money(new.total));
    end if;
    if new.status = 'new' and new.kind = 'table' then   -- доставку зал получает отдельным сообщением (tg_on_delivery)
      perform private.tg_send_to(private.tg_floor_chats(new.table_id), 'Новый заказ №' || new.no || ' · стол ' || new.table_label || E'\n' || coalesce(v_lines, '')
        || coalesce(E'\nКомментарий: ' || new.note, ''));
    end if;
    -- повар получает заказ сразу, без «принять»
    if new.status in ('new', 'accepted') then
      perform private.tg_send_to(private.tg_cook_chats(), 'На кухню: заказ №' || new.no || ' · стол ' || new.table_label || E'\n'
        || coalesce(v_lines, '') || coalesce(E'\nКомментарий: ' || new.note, ''));
    end if;
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
    declare v_text text := 'Стол ' || new.table_label || ': ' || case when new.kind = 'bill'
      then 'просят счёт' || coalesce(' (' || case new.pay_method when 'cash' then 'наличные' when 'card' then 'карта' else 'QR' end || ')', '')
      else 'зовут официанта' || case new.reason when 'water' then ' — вода' when 'napkins' then ' — салфетки' when 'cutlery' then ' — приборы' when 'ice' then ' — лёд' when 'clear' then ' — убрать со стола' else '' end end;
    begin
      if coalesce(v.notify_calls, false) then perform private.tg_send(v_text); end if;
      -- «принесите счёт» — сразу всем официантам с Telegram; остальное — официанту стола
      perform private.tg_send_to(case when new.kind = 'bill' then private.tg_all_waiter_chats() else private.tg_floor_chats(new.table_id) end, v_text);
    end;
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
    perform private.tg_send('Оплачен счёт №' || new.no || ' · стол ' || new.table_label || ': ' || public.tg_money(new.total)
      || case when new.tip > 0 then ' + чаевые ' || public.tg_money(new.tip) else '' end || ' · '
      || case new.method when 'cash' then 'наличные' when 'card' then 'карта' when 'qr' then 'QR' when 'mixed' then 'раздельно' else 'другое' end
      || coalesce(' · ' || new.paid_by_name, ''));
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_bills on public.bills;
create trigger tg_bills after insert on public.bills for each row execute function public.tg_on_bill();

-- Владелец: состояние Telegram (сам токен наружу не отдаётся — только последние символы)
-- имя бота (@…): спрашиваем у Telegram один раз после подключения, ответ приходит чуть позже
create or replace function private.tg_bot_username()
returns text language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype; v_body text; v_name text;
begin
  select * into v from private.telegram where id = 1;
  if v.bot_token is null then return null; end if;
  if v.bot_username is not null then return v.bot_username; end if;
  if to_regclass('net._http_response') is null then return null; end if;
  if v.getme_req is not null then
    execute 'select content from net._http_response where id = $1' into v_body using v.getme_req;
    if v_body is not null then
      begin v_name := (v_body::jsonb) -> 'result' ->> 'username'; exception when others then v_name := null; end;
      update private.telegram set bot_username = v_name, getme_req = null where id = 1;
      return v_name;
    end if;
    return null;
  end if;
  begin
    execute 'select net.http_get(url := $1)' into v.getme_req using 'https://api.telegram.org/bot' || v.bot_token || '/getMe';
    update private.telegram set getme_req = v.getme_req where id = 1;
  exception when others then null;
  end;
  return null;
end $$;

drop function if exists public.telegram_status();
create or replace function public.telegram_status()
returns table (connected boolean, bot_hint text, chats int, notify_orders boolean, notify_calls boolean, notify_bills boolean, net_ok boolean, bot_username text, staff_linked int)
language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  return query select t.bot_token is not null and cardinality(t.chat_ids) > 0,
    case when t.bot_token is null then null else '…' || right(t.bot_token, 4) end,
    cardinality(t.chat_ids), t.notify_orders, t.notify_calls, t.notify_bills,
    to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null,
    private.tg_bot_username(),
    (select count(*)::int from private.staff_tg g join public.staff s on s.user_id = g.user_id where g.chat_id is not null and s.active)
  from private.telegram t where t.id = 1;
end $$;

-- ---------- Сотрудник: подключить свой Telegram ----------
-- 1) my_telegram_start() → код и имя бота; сотрудник открывает t.me/<бот>?start=<код> и жмёт «Start»
-- 2) my_telegram_check() несколько раз: сервер смотрит последние сообщения бота и находит этот код
create or replace function public.my_telegram()
returns table (linked boolean, bot_username text, bot_ready boolean)
language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query select exists (select 1 from private.staff_tg where user_id = auth.uid() and chat_id is not null),
    private.tg_bot_username(), (select bot_token is not null from private.telegram where id = 1);
end $$;

create or replace function public.my_telegram_start()
returns table (code text, bot_username text)
language plpgsql security definer set search_path = public, private as $$
declare v_code text := 'ca' || substr(md5(gen_random_uuid()::text), 1, 10);
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if (select bot_token from private.telegram where id = 1) is null then raise exception 'no_bot'; end if;
  insert into private.staff_tg (user_id, code, code_at, req) values (auth.uid(), v_code, now(), null)
  on conflict (user_id) do update set code = excluded.code, code_at = now(), req = null;
  return query select v_code, private.tg_bot_username();
end $$;

create or replace function public.my_telegram_check()
returns text language plpgsql security definer set search_path = public, private as $$
declare g private.staff_tg%rowtype; v private.telegram%rowtype; v_body text; v_chat text; u jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  select * into g from private.staff_tg where user_id = auth.uid();
  if not found or g.code is null then return case when g.chat_id is not null then 'linked' else 'no_code' end; end if;
  if g.code_at < now() - interval '15 minutes' then return 'expired'; end if;
  select * into v from private.telegram where id = 1;
  if v.bot_token is null or to_regclass('net._http_response') is null then return 'no_bot'; end if;
  if g.req is null then
    execute 'select net.http_get(url := $1)' into g.req using 'https://api.telegram.org/bot' || v.bot_token || '/getUpdates?limit=100&allowed_updates=%5B%22message%22%5D';
    update private.staff_tg set req = g.req where user_id = auth.uid();
    return 'pending';
  end if;
  execute 'select content from net._http_response where id = $1' into v_body using g.req;
  if v_body is null then return 'pending'; end if;
  begin
    for u in select value from jsonb_array_elements((v_body::jsonb) -> 'result') loop
      if btrim(coalesce(u -> 'message' ->> 'text', '')) in ('/start ' || g.code, g.code) then
        v_chat := u -> 'message' -> 'chat' ->> 'id';
      end if;
    end loop;
  exception when others then v_chat := null;
  end;
  if v_chat is null then
    update private.staff_tg set req = null where user_id = auth.uid();  -- в следующий раз спросим заново
    return 'not_found';
  end if;
  update private.staff_tg set chat_id = v_chat, code = null, code_at = null, req = null where user_id = auth.uid();
  perform private.tg_send_to(array[v_chat], 'Готово: уведомления ' || coalesce((select name from public.settings where id = 1), '') || ' подключены для ' || coalesce(public.staff_name(), 'вас') || '.');
  return 'linked';
end $$;

create or replace function public.my_telegram_off()
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  update private.staff_tg set chat_id = null, code = null, req = null where user_id = auth.uid();
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
    bot_username = case when p_token is not null and btrim(p_token) is distinct from bot_token then null else bot_username end,
    getme_req = case when p_token is not null and btrim(p_token) is distinct from bot_token then null else getme_req end,
    bot_token = coalesce(btrim(p_token), bot_token), chat_ids = p_chats,
    notify_orders = coalesce(p_orders, true), notify_calls = coalesce(p_calls, true), notify_bills = coalesce(p_bills, false),
    updated_at = now()
  where id = 1;
end $$;

create or replace function public.clear_telegram()
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update private.telegram set bot_token = null, chat_ids = '{}', bot_username = null, getme_req = null, updated_at = now() where id = 1;
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
revoke all on function private.tg_send_to(text[], text) from public;
revoke all on function private.tg_floor_chats(uuid) from public;
revoke all on function private.tg_cook_chats() from public;
revoke all on function private.tg_all_waiter_chats() from public;
revoke all on function private.tg_bot_username() from public;
revoke all on function public.tg_on_order_status() from public;
revoke all on function public.tg_lines(jsonb) from public;
revoke all on function public.my_telegram() from public;
revoke all on function public.my_telegram_start() from public;
revoke all on function public.my_telegram_check() from public;
revoke all on function public.my_telegram_off() from public;
grant execute on function public.my_telegram() to authenticated;
grant execute on function public.my_telegram_start() to authenticated;
grant execute on function public.my_telegram_check() to authenticated;
grant execute on function public.my_telegram_off() to authenticated;
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
    foreach t in array array['calls', 'bills', 'table_waiters'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- =====================================================================
--  ГОСТЬ: СЧЁТ СТОЛА, ОТЗЫВЫ, «С ЭТИМ БЕРУТ»
-- =====================================================================

-- Гость (по QR своего стола): неоплаченные заказы стола за последние 12 часов — свои и друзей
create or replace function public.table_bill(p_table text)
returns table (no bigint, status text, items jsonb, subtotal numeric, service numeric, tax numeric, total numeric, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.no, o.status, o.items, coalesce(o.subtotal, o.total), o.service, o.tax, o.total, o.created_at
  from public.orders o join public.tables t on t.id = o.table_id
  where t.token = lower(btrim(coalesce(p_table, ''))) and t.active
    and o.paid_at is null and o.status <> 'cancelled' and o.created_at > now() - interval '12 hours'
  order by o.no;
$$;

-- Отзывы гостей: один на заказ (можно поправить), только от того, кто сделал заказ
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid unique references public.orders (id) on delete set null,
  order_no    bigint,
  table_id    uuid references public.tables (id) on delete set null,
  table_label text,
  rating      int not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 500),
  lang        text check (lang is null or char_length(lang) <= 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reviews_created_idx on public.reviews (created_at desc);

create or replace function public.leave_review(p_order uuid, p_token uuid, p_rating int, p_comment text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  select * into v_o from public.orders where id = p_order and guest_token = p_token;
  if not found then raise exception 'not_found'; end if;
  if v_o.status in ('new', 'cancelled') then raise exception 'too_early'; end if;
  if v_o.created_at < now() - interval '2 days' then raise exception 'too_late'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'bad_rating'; end if;
  insert into public.reviews (order_id, order_no, table_id, table_label, rating, comment, lang)
  values (v_o.id, v_o.no, v_o.table_id, v_o.table_label, p_rating, left(nullif(btrim(coalesce(p_comment, '')), ''), 500), left(nullif(btrim(coalesce(p_lang, '')), ''), 5))
  on conflict (order_id) do update set rating = excluded.rating, comment = excluded.comment, updated_at = now();
end $$;

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
drop policy if exists reviews_owner_read on public.reviews;
create policy reviews_owner_read on public.reviews for select to authenticated using (public.is_manager());

-- новый отзыв → владельцу в Telegram
alter table private.telegram add column if not exists notify_reviews boolean not null default true;
create or replace function public.tg_on_review()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v private.telegram%rowtype;
begin
  begin
    select * into v from private.telegram where id = 1;
    if not coalesce(v.notify_reviews, true) then return null; end if;
    perform private.tg_send('Отзыв · стол ' || coalesce(new.table_label, '?') || ' · заказ №' || coalesce(new.order_no::text, '?') || ': '
      || repeat('★', new.rating) || repeat('☆', 5 - new.rating) || coalesce(E'\n' || new.comment, ''));
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_reviews on public.reviews;
create trigger tg_reviews after insert on public.reviews for each row execute function public.tg_on_review();

-- «С этим берут» и «Хиты»: что чаще заказывают (за 30 дней) и что берут вместе (за 60 дней).
-- Только счётчики по блюдам — никаких данных о гостях.
create or replace function public.menu_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with lines as (
    select o.id as oid, o.created_at, i ->> 'id' as dish, (i ->> 'qty')::int as qty
    from public.orders o, jsonb_array_elements(o.items) i
    where o.status <> 'cancelled' and o.created_at > now() - interval '60 days'),
  pop as (
    select dish, sum(qty) as n from lines where created_at > now() - interval '30 days' group by dish order by n desc limit 12),
  pr as (
    select a.dish as a, b.dish as b, count(distinct a.oid) as n
    from lines a join lines b on a.oid = b.oid and a.dish <> b.dish group by a.dish, b.dish),
  top as (
    select a, b, row_number() over (partition by a order by n desc, b) as rk from pr where n >= 2)
  select jsonb_build_object(
    'popular', coalesce((select jsonb_agg(dish order by n desc) from pop), '[]'),
    'pairs', coalesce((select jsonb_object_agg(a, l) from (select a, jsonb_agg(b order by rk) as l from top where rk <= 3 group by a) x), '{}'));
$$;

revoke all on function public.table_bill(text) from public;
revoke all on function public.leave_review(uuid, uuid, int, text, text) from public;
revoke all on function public.tg_on_review() from public;
revoke all on function public.menu_stats() from public;
grant execute on function public.table_bill(text) to anon, authenticated;
grant execute on function public.leave_review(uuid, uuid, int, text, text) to anon, authenticated;
grant execute on function public.menu_stats() to anon, authenticated;

-- telegram_status: + галочка «отзывы»
drop function if exists public.telegram_status();
create or replace function public.telegram_status()
returns table (connected boolean, bot_hint text, chats int, notify_orders boolean, notify_calls boolean, notify_bills boolean, net_ok boolean, bot_username text, staff_linked int, notify_reviews boolean)
language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  return query select t.bot_token is not null and cardinality(t.chat_ids) > 0,
    case when t.bot_token is null then null else '…' || right(t.bot_token, 4) end,
    cardinality(t.chat_ids), t.notify_orders, t.notify_calls, t.notify_bills,
    to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null,
    private.tg_bot_username(),
    (select count(*)::int from private.staff_tg g join public.staff s on s.user_id = g.user_id where g.chat_id is not null and s.active),
    t.notify_reviews
  from private.telegram t where t.id = 1;
end $$;
revoke all on function public.telegram_status() from public;
grant execute on function public.telegram_status() to authenticated;
create or replace function public.set_telegram_reviews(p_on boolean)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update private.telegram set notify_reviews = coalesce(p_on, true) where id = 1;
end $$;
revoke all on function public.set_telegram_reviews(boolean) from public;
grant execute on function public.set_telegram_reviews(boolean) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews') then
    execute 'alter publication supabase_realtime add table public.reviews';
  end if;
end $$;


-- =====================================================================
-- Отмена оплаты, закрытие дня (Z-отчёт), пересадка гостей (2026-11-21)
-- =====================================================================

-- ---------- Отмена оплаты ----------
-- Счёт не удаляется: помечается «отменён» (кто, когда, почему), заказы снова ждут оплаты.
-- Только владелец и только в незакрытом дне — закрытый Z-отчёт не меняется задним числом.
alter table public.bills add column if not exists voided_at timestamptz;
alter table public.bills add column if not exists voided_by uuid references auth.users (id) on delete set null;
alter table public.bills add column if not exists voided_by_name text;
alter table public.bills add column if not exists void_reason text check (void_reason is null or char_length(void_reason) <= 200);

create or replace function public.void_bill(p_bill uuid, p_reason text)
returns setof public.bills language plpgsql security definer set search_path = public, private as $$
declare b public.bills%rowtype; v_reason text := left(nullif(btrim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g')), ''), 200);
begin
  if not public.is_manager() then raise exception 'forbidden'; end if;
  if v_reason is null then raise exception 'void_reason'; end if;
  perform pg_advisory_xact_lock_shared(hashtext('restoran_z_report'));
  select * into b from public.bills where id = p_bill for update;
  if not found then raise exception 'not_found'; end if;
  if b.voided_at is not null then raise exception 'already_voided'; end if;
  if b.paid_at <= coalesce((select max(closed_at) from public.z_reports), '-infinity'::timestamptz) then raise exception 'day_closed'; end if;
  update public.bills set voided_at = clock_timestamp(), voided_by = auth.uid(), voided_by_name = public.staff_name(), void_reason = v_reason
   where id = p_bill returning * into b;
  update public.orders set paid_at = null, bill_id = null where bill_id = p_bill;
  begin
    perform private.tg_send('Отменена оплата счёта №' || b.no || ' · стол ' || b.table_label || ': ' || public.tg_money(b.total)
      || ' · ' || coalesce(b.voided_by_name, '') || ' · причина: ' || v_reason);
  exception when others then null;
  end;
  return next b;
end $$;

-- ---------- Закрытие дня (Z-отчёт) ----------
create table if not exists public.z_reports (
  id             uuid primary key default gen_random_uuid(),
  no             bigint generated always as identity (start with 1) unique,
  opened_at      timestamptz not null,
  closed_at      timestamptz not null,
  closed_by      uuid references auth.users (id) on delete set null,
  closed_by_name text,
  totals         jsonb not null,
  counted_cash   numeric(10, 2) check (counted_cash is null or counted_cash >= 0),
  note           text check (note is null or char_length(note) <= 300)
);
create index if not exists z_reports_closed_idx on public.z_reports (closed_at desc);
alter table public.z_reports enable row level security;
revoke all on public.z_reports from anon, authenticated;
grant select on public.z_reports to authenticated;
drop policy if exists z_owner_read on public.z_reports;
create policy z_owner_read on public.z_reports for select to authenticated using (public.is_manager());

-- начало открытого дня: конец прошлого закрытия (первый раз — с первого счёта или заказа)
create or replace function private.z_open_from()
returns timestamptz language sql stable security definer set search_path = public as $$
  select coalesce((select max(closed_at) from public.z_reports),
                  least((select min(paid_at) from public.bills), (select min(created_at) from public.orders)) - interval '1 microsecond',
                  now());
$$;

-- итоги за период: счета по оплате (p_from, p_to], заказы по времени заказа
create or replace function private.z_totals(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with b as (select * from public.bills where paid_at > p_from and paid_at <= p_to),
  ok as (select * from b where voided_at is null),
  pay as (
    select p ->> 'method' as m, (p ->> 'amount')::numeric as a
      from ok, jsonb_array_elements(case when jsonb_array_length(ok.payments) > 0 then ok.payments
                                         else jsonb_build_array(jsonb_build_object('method', ok.method, 'amount', ok.total + ok.tip + ok.rounding)) end) p),
  o as (select * from public.orders where created_at > p_from and created_at <= p_to)
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'bills', (select count(*) from ok),
    'subtotal', (select coalesce(sum(subtotal), 0) from ok),
    'discount', (select coalesce(sum(discount), 0) from ok),
    'discount_bills', (select count(*) from ok where discount > 0),
    'service', (select coalesce(sum(service), 0) from ok),
    'tax', (select coalesce(sum(tax), 0) from ok),
    'total', (select coalesce(sum(total), 0) from ok),
    'tip', (select coalesce(sum(tip), 0) from ok),
    'rounding', (select coalesce(sum(rounding), 0) from ok),
    'by_method', (select coalesce(jsonb_object_agg(m, s), '{}'::jsonb) from (select m, sum(a) as s from pay group by m) x),
    'cash', (select coalesce(sum(a), 0) from pay where m = 'cash'),
    'voided', (select count(*) from b where voided_at is not null),
    'voided_sum', (select coalesce(sum(total), 0) from b where voided_at is not null),
    'orders', (select count(*) from o where status <> 'cancelled'),
    'cancelled', (select count(*) from o where status = 'cancelled'),
    'cancelled_sum', (select coalesce(sum(total), 0) from o where status = 'cancelled'),
    'open_orders', (select count(*) from public.orders where paid_at is null and status <> 'cancelled' and created_at <= p_to),
    'open_sum', (select coalesce(sum(total), 0) from public.orders where paid_at is null and status <> 'cancelled' and created_at <= p_to),
    'by_cashier', (select coalesce(jsonb_object_agg(k, s), '{}'::jsonb) from (select coalesce(paid_by_name, '—') as k, sum(total) as s from ok group by 1) y)
  );
$$;

-- что попадёт в Z-отчёт, если закрыть день сейчас
create or replace function public.z_preview()
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
begin
  if not public.is_manager() then raise exception 'forbidden'; end if;
  return private.z_totals(private.z_open_from(), now());
end $$;

-- закрыть день: итоги записываются навсегда, следующий день начинается с этой минуты
create or replace function public.close_day(p_counted numeric default null, p_note text default null)
returns setof public.z_reports language plpgsql security definer set search_path = public, private as $$
declare v_from timestamptz; v_to timestamptz; r public.z_reports%rowtype;
begin
  if not public.is_manager() then raise exception 'forbidden'; end if;
  if p_counted is not null and (p_counted < 0 or p_counted > 10000000) then raise exception 'bad_amount'; end if;
  -- ждём, пока закончатся идущие оплаты; новые оплаты подождут нас
  perform pg_advisory_xact_lock(hashtext('restoran_z_report'));
  v_from := private.z_open_from();
  v_to := clock_timestamp();
  insert into public.z_reports (opened_at, closed_at, closed_by, closed_by_name, totals, counted_cash, note)
  values (v_from, v_to, auth.uid(), public.staff_name(), private.z_totals(v_from, v_to), round(p_counted, 2),
          left(nullif(btrim(coalesce(p_note, '')), ''), 300))
  returning * into r;
  begin
    perform private.tg_send('Закрыт день, Z-отчёт №' || r.no || ': выручка ' || public.tg_money((r.totals ->> 'total')::numeric)
      || ' · счетов ' || (r.totals ->> 'bills') || ' · наличными ' || public.tg_money((r.totals ->> 'cash')::numeric)
      || case when r.counted_cash is not null then ' · в кассе ' || public.tg_money(r.counted_cash) else '' end
      || coalesce(' · ' || r.closed_by_name, ''));
  exception when others then null;
  end;
  return next r;
end $$;

-- ---------- Пересадить гостей / объединить столы ----------
-- Неоплаченные заказы (все или выбранные) переходят на другой стол вместе с открытыми вызовами.
-- Официант стола переходит к новому столу, если там своего нет. Старый стол освобождается, если на нём ничего не осталось.
create or replace function public.move_orders(p_from uuid, p_to uuid, p_orders uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_label text; n int;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if p_from is null or p_to is null or p_from = p_to then raise exception 'same_table'; end if;
  select label into v_label from public.tables where id = p_to and active;
  if v_label is null then raise exception 'not_found'; end if;
  perform 1 from public.orders where table_id = p_from and paid_at is null for update;
  update public.orders set table_id = p_to, table_label = v_label
   where table_id = p_from and paid_at is null and status <> 'cancelled'
     and (p_orders is null or id = any (p_orders));
  get diagnostics n = row_count;
  if n = 0 then raise exception 'nothing_to_move'; end if;
  insert into public.table_waiters (table_id, user_id)
    select p_to, user_id from public.table_waiters where table_id = p_from
  on conflict (table_id) do nothing;
  if not exists (select 1 from public.orders where table_id = p_from and paid_at is null and status <> 'cancelled') then
    update public.calls set table_id = p_to, table_label = v_label where table_id = p_from and done_at is null;
    delete from public.table_waiters where table_id = p_from;
  end if;
  return n;
end $$;

revoke all on function public.void_bill(uuid, text) from public, anon;
revoke all on function public.z_preview() from public, anon;
revoke all on function public.close_day(numeric, text) from public, anon;
revoke all on function public.move_orders(uuid, uuid, uuid[]) from public, anon;
revoke all on function private.z_open_from() from public, anon, authenticated;
revoke all on function private.z_totals(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.void_bill(uuid, text) to authenticated;
grant execute on function public.z_preview() to authenticated;
grant execute on function public.close_day(numeric, text) to authenticated;
grant execute on function public.move_orders(uuid, uuid, uuid[]) to authenticated;

-- =====================================================================
-- Гость: чек в телефоне, ссылка на отзыв в Google (2026-11-21)
-- =====================================================================
alter table public.settings add column if not exists google_review_url text
  check (google_review_url is null or (google_review_url ~ '^https://' and char_length(google_review_url) <= 500));

-- Чек оплаченного заказа: только у того, кто держит секрет этого заказа (guest_token).
-- В чеке весь счёт стола (все заказы, которые оплатили вместе). Отменённая оплата — чека нет.
create or replace function public.guest_receipt(p_order uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'no', b.no, 'paid_at', b.paid_at, 'table_label', b.table_label, 'order_nos', b.order_nos,
    'subtotal', b.subtotal, 'discount', b.discount, 'discount_pct', b.discount_pct, 'discount_reason', b.discount_reason,
    'service', b.service, 'tax', b.tax, 'total', b.total, 'tip', b.tip, 'rounding', b.rounding,
    'payments', b.payments, 'method', b.method, 'cashier', b.paid_by_name,
    'waiters', (select coalesce(jsonb_agg(distinct x.served_by_name), '[]'::jsonb) from public.orders x where x.id = any (b.order_ids) and x.served_by_name is not null),
    'items', (select coalesce(jsonb_agg(i order by x.no), '[]'::jsonb) from public.orders x, jsonb_array_elements(x.items) i where x.id = any (b.order_ids)))
  from public.orders o join public.bills b on b.id = o.bill_id
  where o.id = p_order and o.guest_token = p_token and b.voided_at is null;
$$;
revoke all on function public.guest_receipt(uuid, uuid) from public;
grant execute on function public.guest_receipt(uuid, uuid) to anon, authenticated;

-- китайский язык (2026-11-21): язык по умолчанию может быть и zh
alter table public.settings drop constraint if exists settings_default_language_check;
alter table public.settings add constraint settings_default_language_check check (default_language in ('ru', 'uz', 'en', 'ar', 'ms', 'zh'));

-- =====================================================================
-- Админка: язык чека, резервная копия, менеджер (2026-11-21)
-- =====================================================================
-- язык бумажного чека и счёта (одинаковый у всех, кто печатает)
alter table public.settings add column if not exists receipt_lang text not null default 'en';
alter table public.settings drop constraint if exists settings_receipt_lang_check;
alter table public.settings add constraint settings_receipt_lang_check check (receipt_lang in ('en', 'ms', 'ru', 'uz'));
-- когда владелец последний раз скачал резервную копию (для напоминания раз в неделю)
alter table public.settings add column if not exists backup_at timestamptz;
create or replace function public.mark_backup()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v timestamptz := now();
begin
  if not public.is_owner() then raise exception 'forbidden'; end if;
  update public.settings set backup_at = v where id = 1;
  return v;
end $$;
revoke all on function public.mark_backup() from public, anon;
revoke all on function public.is_manager() from public;
grant execute on function public.mark_backup() to authenticated;

-- =====================================================================
-- Большая партия (2026-11-21): стоп-лист с кухни, остатки, себестоимость, оценки блюд,
-- бронь стола, смены, цель дня, бар-экран
-- =====================================================================
alter table public.settings add column if not exists day_goal numeric(10, 2) check (day_goal is null or (day_goal > 0 and day_goal < 10000000));
alter table public.settings add column if not exists bookings_enabled boolean not null default true;
-- где готовят блюда категории: кухня или бар (бар видит только свои напитки)
alter table public.categories add column if not exists station text not null default 'kitchen';
alter table public.categories drop constraint if exists categories_station_check;
alter table public.categories add constraint categories_station_check check (station in ('kitchen', 'bar'));

-- ---------- Остатки: заказ сам списывает порции, отмена возвращает ----------
create or replace function private.order_qty(p_items jsonb)
returns table (dish text, qty int) language sql immutable as $$
  select i ->> 'id', sum((i ->> 'qty')::int)::int from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i group by 1;
$$;
create or replace function public.orders_stock()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare r record; v int;
begin
  for r in
    select coalesce(n.dish, o.dish) as dish, coalesce(n.qty, 0) - coalesce(o.qty, 0) as delta
    from (select * from private.order_qty(case when new.status <> 'cancelled' then new.items end)) n
    full join (select * from private.order_qty(case when tg_op = 'UPDATE' and old.status <> 'cancelled' then old.items end)) o on o.dish = n.dish
  loop
    if r.delta = 0 then continue; end if;
    select stock into v from public.dishes where id = r.dish for update;
    if v is null then continue; end if;
    if v - r.delta < 0 then raise exception 'sold_out:%', r.dish; end if;
    perform set_config('restoran.stock_auto', '1', true);
    update public.dishes set stock = v - r.delta where id = r.dish;
    perform set_config('restoran.stock_auto', '', true);
  end loop;
  return new;
end $$;
drop trigger if exists orders_stock on public.orders;
create trigger orders_stock before insert or update of items, status on public.orders
  for each row execute function public.orders_stock();

-- ---------- Стоп-лист и остатки: владелец, менеджер и повар ----------
create or replace function public.set_dish_available(p_dish text, p_on boolean)
returns setof public.dishes language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_manager() or public.staff_role() = 'cook') then raise exception 'forbidden'; end if;
  if p_on is null then raise exception 'bad_request'; end if;
  return query update public.dishes set available = p_on,
         stock = case when p_on and stock = 0 then null else stock end   -- снова в продаже — счётчик «0» больше не держит
   where id = p_dish returning *;
  if not found then raise exception 'not_found'; end if;
end $$;
create or replace function public.set_dish_stock(p_dish text, p_stock int)
returns setof public.dishes language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_manager() or public.staff_role() = 'cook') then raise exception 'forbidden'; end if;
  if p_stock is not null and p_stock not between 0 and 100000 then raise exception 'bad_request'; end if;
  return query update public.dishes set stock = p_stock, available = case when p_stock > 0 then true else available end
   where id = p_dish returning *;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------- Себестоимость: только владелец (гость и персонал не видят) ----------
create table if not exists public.dish_costs (
  dish_id    text primary key references public.dishes (id) on update cascade on delete cascade,
  cost       numeric(10, 2) not null check (cost >= 0 and cost < 100000),
  updated_at timestamptz not null default now()
);
alter table public.dish_costs enable row level security;
revoke all on public.dish_costs from anon, authenticated;
grant select, insert, update, delete on public.dish_costs to authenticated;
drop policy if exists dish_costs_owner on public.dish_costs;
create policy dish_costs_owner on public.dish_costs for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------- Оценка каждого блюда: понравилось (1) / не понравилось (-1) ----------
create table if not exists public.dish_votes (
  order_id   uuid not null references public.orders (id) on delete cascade,
  dish_id    text not null,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (order_id, dish_id)
);
create index if not exists dish_votes_created_idx on public.dish_votes (created_at desc);
alter table public.dish_votes enable row level security;
revoke all on public.dish_votes from anon, authenticated;
grant select on public.dish_votes to authenticated;
drop policy if exists dish_votes_read on public.dish_votes;
create policy dish_votes_read on public.dish_votes for select to authenticated using (public.is_manager());

-- p_votes: { "plov-tashkent": 1, "samsa": -1, "tea": 0 } — 0 убирает оценку
create or replace function public.vote_dishes(p_order uuid, p_token uuid, p_votes jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; k text; v int; n int := 0;
begin
  select * into v_o from public.orders where id = p_order and guest_token = p_token;
  if not found then raise exception 'not_found'; end if;
  if v_o.status in ('new', 'cancelled') then raise exception 'too_early'; end if;
  if v_o.created_at < now() - interval '2 days' then raise exception 'too_late'; end if;
  if p_votes is null or jsonb_typeof(p_votes) <> 'object' then raise exception 'bad_request'; end if;
  for k, v in select key, (value #>> '{}')::int from jsonb_each(p_votes) loop
    if not exists (select 1 from jsonb_array_elements(v_o.items) i where i ->> 'id' = k) then raise exception 'bad_request'; end if;
    if v = 0 then delete from public.dish_votes where order_id = p_order and dish_id = k;
    elsif v in (-1, 1) then
      insert into public.dish_votes (order_id, dish_id, vote) values (p_order, k, v)
      on conflict (order_id, dish_id) do update set vote = excluded.vote, created_at = now();
      n := n + 1;
    else raise exception 'bad_request'; end if;
  end loop;
  return n;
end $$;

-- ---------- Бронь стола ----------
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  no          bigint generated always as identity (start with 101) unique,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  phone       text not null check (phone ~ '^\+?[0-9][0-9 ()-]{5,19}$'),
  at          timestamptz not null,
  people      int not null check (people between 1 and 50),
  note        text check (note is null or char_length(note) <= 300),
  lang        text check (lang is null or char_length(lang) <= 5),
  status      text not null default 'new' check (status in ('new', 'confirmed', 'seated', 'cancelled', 'no_show')),
  table_id    uuid references public.tables (id) on delete set null,
  table_label text,
  client_key  uuid not null unique,
  guest_token uuid not null default gen_random_uuid(),
  decided_by_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reservations_at_idx on public.reservations (at);
alter table public.reservations enable row level security;
revoke all on public.reservations from anon, authenticated;
grant select on public.reservations to authenticated;
drop policy if exists reservations_floor_read on public.reservations;
create policy reservations_floor_read on public.reservations for select to authenticated using (public.is_floor());

drop function if exists public.book_table(text, text, timestamptz, int, text, text, uuid);
create or replace function public.book_table(p_name text, p_phone text, p_at timestamptz, p_people int, p_note text, p_lang text, p_client_key uuid)
returns table (id uuid, no bigint, guest_token uuid, status text, at timestamptz, people int)
language plpgsql security definer set search_path = public as $$
declare v_set public.settings%rowtype; v_r public.reservations%rowtype;
        v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '\s+', ' ', 'g');
begin
  if p_client_key is null then raise exception 'bad_request'; end if;
  select * into v_r from public.reservations r where r.client_key = p_client_key;
  if found then return query select v_r.id, v_r.no, v_r.guest_token, v_r.status, v_r.at, v_r.people; return; end if;
  select * into v_set from public.settings s where s.id = 1;
  if not v_set.bookings_enabled then raise exception 'bookings_off'; end if;
  if p_at is null or p_at < now() + interval '30 minutes' or p_at > now() + interval '60 days' then raise exception 'bad_time'; end if;
  if not public.restaurant_open(p_at) then raise exception 'closed_then'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 or v_phone !~ '^\+?[0-9][0-9 ()-]{5,19}$'
     or p_people is null or p_people not between 1 and 50 then raise exception 'bad_request'; end if;
  -- защита от спама: с одного номера не больше 3 будущих броней, со всех — 30 в час
  if (select count(*) from public.reservations r where regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
        and r.status in ('new', 'confirmed') and r.at > now()) >= 3
     or (select count(*) from public.reservations r where r.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many';
  end if;
  insert into public.reservations as r (name, phone, at, people, note, lang, client_key)
  values (btrim(p_name), v_phone, p_at, p_people, left(nullif(btrim(coalesce(p_note, '')), ''), 300), left(nullif(btrim(coalesce(p_lang, '')), ''), 5), p_client_key)
  returning * into v_r;
  return query select v_r.id, v_r.no, v_r.guest_token, v_r.status, v_r.at, v_r.people;
end $$;

-- гость смотрит свою бронь (нужен секрет брони)
create or replace function public.my_booking(p_id uuid, p_token uuid)
returns table (id uuid, no bigint, status text, at timestamptz, people int, table_label text)
language sql stable security definer set search_path = public as $$
  select r.id, r.no, r.status, r.at, r.people, r.table_label from public.reservations r
  where r.id = p_id and r.guest_token = p_token and r.at > now() - interval '1 day';
$$;
create or replace function public.cancel_booking(p_id uuid, p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  update public.reservations r set status = 'cancelled', updated_at = now(), decided_by_name = null
   where r.id = p_id and r.guest_token = p_token and r.status in ('new', 'confirmed') and r.at > now()
  returning r.status into v;
  if v is null then raise exception 'not_found'; end if;
  return v;
end $$;

-- зал: подтвердить, посадить, отменить, «не пришли»; можно сразу выбрать стол
create or replace function public.set_booking(p_id uuid, p_status text, p_table uuid default null)
returns setof public.reservations language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if not public.is_floor() then raise exception 'forbidden'; end if;
  if p_status not in ('new', 'confirmed', 'seated', 'cancelled', 'no_show') then raise exception 'bad_status'; end if;
  if p_table is not null then
    select label into v_label from public.tables where id = p_table;
    if v_label is null then raise exception 'bad_table'; end if;
  end if;
  return query update public.reservations r
     set status = p_status, updated_at = now(), decided_by_name = public.staff_name(),
         table_id = coalesce(p_table, r.table_id), table_label = coalesce(v_label, r.table_label)
   where r.id = p_id returning *;
  if not found then raise exception 'not_found'; end if;
end $$;

-- новая бронь — в Telegram владельцу и всем официантам
create or replace function public.tg_on_booking()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v_tz text; v_txt text;
begin
  select timezone into v_tz from public.settings where id = 1;
  v_txt := 'Бронь №' || new.no || ': ' || to_char(new.at at time zone v_tz, 'DD.MM HH24:MI') || ', гостей ' || new.people
           || E'\n' || new.name || ' · ' || new.phone || coalesce(E'\n>> ' || new.note, '');
  begin
    perform private.tg_send(v_txt);
    perform private.tg_send_to(private.tg_all_waiter_chats(), v_txt);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_booking on public.reservations;
create trigger tg_booking after insert on public.reservations for each row execute function public.tg_on_booking();

-- ---------- Смены: «Пришёл» / «Ушёл» ----------
create table if not exists public.shifts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text,
  role       text,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists shifts_open_uniq on public.shifts (user_id) where ended_at is null;
create index if not exists shifts_started_idx on public.shifts (started_at desc);
alter table public.shifts enable row level security;
revoke all on public.shifts from anon, authenticated;
grant select on public.shifts to authenticated;
drop policy if exists shifts_read on public.shifts;
create policy shifts_read on public.shifts for select to authenticated using (user_id = auth.uid() or public.is_manager());

create or replace function public.shift_start()
returns setof public.shifts language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  insert into public.shifts (user_id, name, role) values (auth.uid(), public.staff_name(), public.staff_role())
  on conflict (user_id) where ended_at is null do nothing;
  return query select * from public.shifts where user_id = auth.uid() and ended_at is null;
end $$;
create or replace function public.shift_end()
returns setof public.shifts language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query update public.shifts set ended_at = now() where user_id = auth.uid() and ended_at is null returning *;
end $$;

revoke all on function public.dish_price(public.dishes, timestamptz) from public;
grant execute on function public.dish_price(public.dishes, timestamptz) to anon, authenticated;
revoke all on function private.order_qty(jsonb) from public;
revoke all on function public.set_dish_available(text, boolean) from public, anon;
revoke all on function public.set_dish_stock(text, int) from public, anon;
revoke all on function public.vote_dishes(uuid, uuid, jsonb) from public;
revoke all on function public.book_table(text, text, timestamptz, int, text, text, uuid) from public;
revoke all on function public.my_booking(uuid, uuid) from public;
revoke all on function public.cancel_booking(uuid, uuid) from public;
revoke all on function public.set_booking(uuid, text, uuid) from public, anon;
revoke all on function public.shift_start() from public, anon;
revoke all on function public.shift_end() from public, anon;
grant execute on function public.set_dish_available(text, boolean) to authenticated;
grant execute on function public.set_dish_stock(text, int) to authenticated;
grant execute on function public.vote_dishes(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.book_table(text, text, timestamptz, int, text, text, uuid) to anon, authenticated;
grant execute on function public.my_booking(uuid, uuid) to anon, authenticated;
grant execute on function public.cancel_booking(uuid, uuid) to anon, authenticated;
grant execute on function public.set_booking(uuid, text, uuid) to authenticated;
grant execute on function public.shift_start() to authenticated;
grant execute on function public.shift_end() to authenticated;
-- журнал: брони и смены тоже видны владельцу
drop trigger if exists audit_reservations on public.reservations;
create trigger audit_reservations after update on public.reservations for each row execute function public.audit_row('booking');
-- живые обновления: брони и смены
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['reservations', 'shifts'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- =====================================================================
-- Доставка домой своим курьером (2026-11-22)
-- Гость ставит точку на карте; цена доставки — по километрам от ресторана
-- (по прямой), платит гость сверху; расчёт с курьером при получении.
-- =====================================================================
alter table public.settings add column if not exists delivery_enabled boolean not null default false;
alter table public.settings add column if not exists delivery_lat numeric(9, 6) check (delivery_lat is null or delivery_lat between -90 and 90);
alter table public.settings add column if not exists delivery_lng numeric(9, 6) check (delivery_lng is null or delivery_lng between -180 and 180);
-- зоны: [{ "km": 3, "fee": 5 }, { "km": 7, "fee": 10 }] — до 3 км RM 5, до 7 км RM 10, дальше не возим
alter table public.settings add column if not exists delivery_zones jsonb not null default '[]';
alter table public.settings add column if not exists delivery_min numeric(10, 2) not null default 0 check (delivery_min >= 0 and delivery_min < 100000);
create or replace function public.valid_zones(z jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(z) = 'array' and jsonb_array_length(z) <= 8 and not exists (
    select 1 from jsonb_array_elements(z) e
    where jsonb_typeof(e) <> 'object' or jsonb_typeof(e -> 'km') <> 'number' or jsonb_typeof(e -> 'fee') <> 'number'
       or (e ->> 'km')::numeric not between 0.3 and 60 or (e ->> 'fee')::numeric not between 0 and 1000);
$$;
alter table public.settings drop constraint if exists settings_zones_check;
alter table public.settings add constraint settings_zones_check check (public.valid_zones(delivery_zones));

alter table public.orders add column if not exists customer_name text check (customer_name is null or char_length(customer_name) <= 60);
alter table public.orders add column if not exists customer_phone text check (customer_phone is null or char_length(customer_phone) <= 20);
alter table public.orders add column if not exists address text check (address is null or char_length(address) <= 300);
-- почта гостя для доставки (приложение спрашивает её до заказа; сайт может не присылать)
alter table public.orders add column if not exists customer_email text check (customer_email is null or char_length(customer_email) <= 120);
alter table public.orders add column if not exists lat numeric(9, 6);
alter table public.orders add column if not exists lng numeric(9, 6);
alter table public.orders add column if not exists distance_km numeric(6, 2);
alter table public.orders add column if not exists delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0);
alter table public.orders add column if not exists pay_method text check (pay_method is null or pay_method in ('cash', 'card'));
alter table public.orders add column if not exists courier_id uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists picked_at timestamptz;
create index if not exists orders_delivery_idx on public.orders (created_at desc) where kind = 'delivery';
alter table public.bills add column if not exists delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0);

-- расстояние по прямой между двумя точками, км (формула гаверсинуса)
create or replace function public.km_between(a_lat numeric, a_lng numeric, b_lat numeric, b_lng numeric)
returns numeric language sql immutable as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians((b_lat - a_lat)::float8) / 2), 2)
    + cos(radians(a_lat::float8)) * cos(radians(b_lat::float8)) * power(sin(radians((b_lng - a_lng)::float8) / 2), 2))))::numeric, 2);
$$;

-- гость: сколько стоит доставка в эту точку (до заказа)
create or replace function public.delivery_quote(p_lat numeric, p_lng numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v public.settings%rowtype; d numeric; z jsonb;
begin
  select * into v from public.settings where id = 1;
  if not v.delivery_enabled or v.delivery_lat is null or jsonb_array_length(v.delivery_zones) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'off');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'reason', 'bad_point');
  end if;
  d := public.km_between(v.delivery_lat, v.delivery_lng, p_lat, p_lng);
  select e into z from jsonb_array_elements(v.delivery_zones) e where (e ->> 'km')::numeric >= d order by (e ->> 'km')::numeric limit 1;
  if z is null then return jsonb_build_object('ok', false, 'reason', 'too_far', 'km', d); end if;
  return jsonb_build_object('ok', true, 'km', d, 'fee', (z ->> 'fee')::numeric, 'zone_km', (z ->> 'km')::numeric, 'min', v.delivery_min);
end $$;

-- гость: заказать доставку (как place_order, но без стола)
drop function if exists public.place_delivery(jsonb, text, text, text, text, numeric, numeric, text, text, uuid);
drop function if exists public.place_delivery(jsonb, text, text, text, text, numeric, numeric, text, text, uuid, text);
create or replace function public.place_delivery(
  p_items jsonb, p_name text, p_phone text, p_address text, p_note text, p_lat numeric, p_lng numeric, p_pay text, p_lang text, p_client_key uuid,
  p_email text default null)
returns table (id uuid, no bigint, guest_token uuid, total numeric, status text, items jsonb, created_at timestamptz,
               subtotal numeric, tax numeric, delivery_fee numeric, distance_km numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_set public.settings%rowtype; v_old public.orders%rowtype; v_q jsonb; v_item jsonb; v_line jsonb;
  v_items jsonb := '[]'::jsonb; v_sub numeric(10, 2) := 0; v_tax numeric(10, 2); v_count int := 0; v_keys text[] := '{}';
  v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '\s+', ' ', 'g');
  v_name text := btrim(coalesce(p_name, '')); v_addr text := btrim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g'));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if p_client_key is null then raise exception 'bad_request'; end if;
  select * into v_old from public.orders o where o.client_key = p_client_key;
  if found then
    return query select v_old.id, v_old.no, v_old.guest_token, v_old.total, v_old.status, v_old.items, v_old.created_at,
                        v_old.subtotal, v_old.tax, v_old.delivery_fee, v_old.distance_km;
    return;
  end if;
  select * into v_set from public.settings s where s.id = 1;
  if not v_set.orders_enabled then raise exception 'orders_off'; end if;
  if not v_set.orders_when_closed and not public.restaurant_open() then raise exception 'closed'; end if;
  v_q := public.delivery_quote(p_lat, p_lng);
  if not (v_q ->> 'ok')::boolean then
    raise exception '%', case v_q ->> 'reason' when 'off' then 'delivery_off' when 'too_far' then 'too_far' else 'bad_point' end;
  end if;
  if char_length(v_name) not between 1 and 60 or v_phone !~ '^\+?[0-9][0-9 ()-]{5,19}$'
     or char_length(v_addr) not between 5 and 300 or coalesce(p_pay, '') not in ('cash', 'card')
     or (v_email is not null and (char_length(v_email) > 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')) then
    raise exception 'bad_request';
  end if;
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
  if v_sub < v_set.delivery_min then raise exception 'below_min'; end if;
  -- защита от спама: с одного номера не больше 3 незавершённых доставок, со всего ресторана — 60 заказов в минуту
  if (select count(*) from public.orders o where o.kind = 'delivery' and o.status not in ('served', 'cancelled')
        and o.created_at > now() - interval '12 hours'
        and regexp_replace(o.customer_phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')) >= 3
     or (select count(*) from public.orders o where o.created_at > now() - interval '1 minute') >= 60 then
    raise exception 'too_many';
  end if;
  -- у доставки нет сервисного сбора (он за обслуживание в зале); налог — как в зале
  v_tax := round(v_sub * coalesce(v_set.tax_pct, 0) / 100, 2);
  return query
    insert into public.orders as o (kind, table_id, table_label, items, subtotal, service, tax, delivery_fee, total, note, lang, client_key,
                                    customer_name, customer_phone, customer_email, address, lat, lng, distance_km, pay_method)
    values ('delivery', null, 'Доставка', v_items, v_sub, 0, v_tax, (v_q ->> 'fee')::numeric, v_sub + v_tax + (v_q ->> 'fee')::numeric,
            left(nullif(btrim(coalesce(p_note, '')), ''), 300), left(nullif(btrim(coalesce(p_lang, '')), ''), 5), p_client_key,
            v_name, v_phone, v_email, v_addr, p_lat, p_lng, (v_q ->> 'km')::numeric, p_pay)
    returning o.id, o.no, o.guest_token, o.total, o.status, o.items, o.created_at, o.subtotal, o.tax, o.delivery_fee, o.distance_km;
end $$;

-- гость смотрит свой заказ: и стол, и доставка
drop function if exists public.get_order(uuid, uuid);
create or replace function public.get_order(p_id uuid, p_token uuid)
returns table (id uuid, no bigint, status text, total numeric, table_label text, items jsonb, note text, created_at timestamptz, updated_at timestamptz, accepted_at timestamptz,
               subtotal numeric, service numeric, tax numeric, paid_at timestamptz, edited_at timestamptz,
               kind text, delivery_fee numeric, distance_km numeric, address text, pay_method text, courier_name text, picked_at timestamptz, served_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.no, o.status, o.total, o.table_label, o.items, o.note, o.created_at, o.updated_at, o.accepted_at,
         coalesce(o.subtotal, o.total), o.service, o.tax, o.paid_at, o.edited_at,
         o.kind, o.delivery_fee, o.distance_km, o.address, o.pay_method, o.courier_name, o.picked_at, o.served_at
  from public.orders o
  where o.id = p_id and o.guest_token = p_token and o.created_at > now() - interval '3 days';
$$;

-- ---------- Курьер ----------
create or replace function public.is_courier()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role() in ('courier', 'owner', 'manager'), false);
$$;
-- забрал заказ — «В пути»
create or replace function public.courier_take(p_id uuid)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype;
begin
  if not public.is_courier() then raise exception 'forbidden'; end if;
  select * into v_o from public.orders where id = p_id for update;
  if not found or v_o.kind <> 'delivery' then raise exception 'not_found'; end if;
  if v_o.status = 'on_the_way' and v_o.courier_id is distinct from auth.uid() then raise exception 'taken'; end if;
  if v_o.status not in ('new', 'accepted', 'cooking', 'ready', 'on_the_way') then raise exception 'bad_status'; end if;
  return query update public.orders set status = 'on_the_way', courier_id = auth.uid(), courier_name = public.staff_name(),
         picked_at = coalesce(picked_at, now()), accepted_at = coalesce(accepted_at, now())
   where id = p_id returning *;
end $$;
-- доставил и получил деньги — заказ закрыт, счёт оплачен (попадает в отчёты и Z-отчёт)
create or replace function public.courier_done(p_id uuid, p_method text)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_set public.settings%rowtype; v_bill public.bills%rowtype; v_round numeric(10, 2) := 0;
begin
  if not public.is_courier() then raise exception 'forbidden'; end if;
  if p_method not in ('cash', 'card') then raise exception 'bad_request'; end if;
  perform pg_advisory_xact_lock_shared(hashtext('restoran_z_report'));
  select * into v_o from public.orders where id = p_id for update;
  if not found or v_o.kind <> 'delivery' then raise exception 'not_found'; end if;
  if v_o.paid_at is not null then return query select * from public.orders where id = p_id; return; end if;
  if v_o.status = 'cancelled' then raise exception 'cancelled'; end if;
  if v_o.status = 'on_the_way' and v_o.courier_id is distinct from auth.uid() and not public.is_manager() then raise exception 'taken'; end if;
  select * into v_set from public.settings where id = 1;
  if p_method = 'cash' and v_set.cash_rounding then v_round := round(v_o.total * 20) / 20 - v_o.total; end if;
  insert into public.bills (table_id, table_label, order_ids, order_nos, subtotal, service, tax, delivery_fee, total, tip, payments, method,
                            paid_by, paid_by_name, rounding, paid_at)
  values (null, 'Доставка', array[v_o.id], array[v_o.no], coalesce(v_o.subtotal, v_o.total), 0, v_o.tax, v_o.delivery_fee, v_o.total, 0,
          jsonb_build_array(jsonb_build_object('method', p_method, 'amount', v_o.total + v_round)), p_method,
          auth.uid(), public.staff_name(), v_round, clock_timestamp())
  returning * into v_bill;
  return query update public.orders set status = 'served', paid_at = v_bill.paid_at, bill_id = v_bill.id, pay_method = p_method,
         served_by = auth.uid(), served_by_name = public.staff_name(),
         courier_id = coalesce(courier_id, auth.uid()), courier_name = coalesce(courier_name, public.staff_name()), picked_at = coalesce(picked_at, now())
   where id = p_id returning *;
end $$;

-- Telegram о доставке: владельцу (как обычный заказ) + всем в зале и курьерам; адрес и телефон — в сообщении
create or replace function private.tg_courier_chats()
returns text[] language sql stable security definer set search_path = public, private as $$
  select coalesce(array_agg(g.chat_id), '{}') from public.staff s join private.staff_tg g on g.user_id = s.user_id
  where s.active and s.role = 'courier' and g.chat_id is not null;
$$;
revoke all on function private.tg_courier_chats() from public;
create or replace function public.tg_on_delivery()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare v_txt text;
begin
  if new.kind <> 'delivery' then return null; end if;
  begin
    v_txt := 'Доставка №' || new.no || ' · ' || coalesce(new.distance_km::text, '?') || ' км' || E'\n'
      || coalesce(public.tg_lines(new.items), '') || E'\n' || new.customer_name || ' · ' || new.customer_phone || E'\n' || new.address
      || coalesce(E'\n>> ' || new.note, '') || E'\nК оплате: ' || public.tg_money(new.total)
      || ' (' || case new.pay_method when 'card' then 'картой' else 'наличными' end || ' курьеру)';
    perform private.tg_send_to(private.tg_all_waiter_chats() || private.tg_courier_chats(), v_txt);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists tg_delivery on public.orders;
create trigger tg_delivery after insert on public.orders for each row execute function public.tg_on_delivery();

revoke all on function public.delivery_quote(numeric, numeric) from public;
revoke all on function public.place_delivery(jsonb, text, text, text, text, numeric, numeric, text, text, uuid, text) from public;
revoke all on function public.get_order(uuid, uuid) from public;
revoke all on function public.courier_take(uuid) from public, anon;
revoke all on function public.courier_done(uuid, text) from public, anon;
grant execute on function public.delivery_quote(numeric, numeric) to anon, authenticated;
grant execute on function public.place_delivery(jsonb, text, text, text, text, numeric, numeric, text, text, uuid, text) to anon, authenticated;
grant execute on function public.get_order(uuid, uuid) to anon, authenticated;
grant execute on function public.is_courier() to authenticated;
grant execute on function public.courier_take(uuid) to authenticated;
grant execute on function public.courier_done(uuid, text) to authenticated;
