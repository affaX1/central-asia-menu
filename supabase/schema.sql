-- =====================================================================
--  Central Asia Restaurant — заказы со столов.
--  Вставить целиком в Supabase → SQL Editor → Run. Можно запускать повторно.
--
--  Кто что может:
--    гости (anon)         — только отправить заказ (place_order)
--                           и узнать статус своего заказа по его id (order_status);
--                           читать чужие заказы НЕ могут.
--    сотрудники (staff)   — видеть заказы и менять им статус. Больше ничего.
--  Цены в базе не хранятся: админка считает суммы по тому же data.js,
--  что и меню, поэтому гость не может подсунуть свою цену.
-- =====================================================================

-- ---------- Сотрудники ----------
create table if not exists public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

-- ---------- Заказы ----------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  no         bigint generated always as identity,  -- номер, который видят гость и кухня
  table_no   text not null check (table_no ~ '^[[:alnum:]-]{1,10}$'),
  items      jsonb not null,                        -- [{ "id": "plov-tashkent", "qty": 2 }, ...]
  note       text check (note is null or char_length(note) <= 300),
  lang       text check (lang is null or char_length(lang) <= 5),
  status     text not null default 'new'
             check (status in ('new', 'accepted', 'cooking', 'served', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_table_created_idx on public.orders (table_no, created_at desc);

-- ---------- Проверка «это сотрудник?» ----------
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ---------- Права ----------
alter table public.orders enable row level security;
alter table public.staff  enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.staff  from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;   -- менять можно только статус
grant select on public.staff to authenticated;

drop policy if exists orders_staff_select on public.orders;
create policy orders_staff_select on public.orders
  for select to authenticated using (public.is_staff());

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_read_self on public.staff;
create policy staff_read_self on public.staff
  for select to authenticated using (user_id = auth.uid());

-- ---------- updated_at ставится сам ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- Гость отправляет заказ ----------
create or replace function public.place_order(
  p_table text,
  p_items jsonb,
  p_note  text default null,
  p_lang  text default null
)
returns table (id uuid, no bigint)
language plpgsql security definer
set search_path = public
as $$
declare
  v_table     text := btrim(coalesce(p_table, ''));
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
  v_items     jsonb := '[]'::jsonb;
  v_item      jsonb;
  v_id        text;
  v_qty       int;
  v_total_qty int := 0;
begin
  if v_table !~ '^[[:alnum:]-]{1,10}$' then
    raise exception 'bad_table';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'bad_items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_id := v_item ->> 'id';
    begin
      v_qty := (v_item ->> 'qty')::int;
    exception when others then
      raise exception 'bad_items';
    end;
    if v_id is null or v_id !~ '^[a-z0-9-]{1,40}$' or v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'bad_items';
    end if;
    v_total_qty := v_total_qty + v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id', v_id, 'qty', v_qty));
  end loop;

  if v_total_qty > 100 then
    raise exception 'bad_items';
  end if;

  -- Защита от спама: не больше 3 заказов со стола за 2 минуты и 60 со всего зала за минуту.
  if (select count(*) from public.orders o
       where o.table_no = v_table and o.created_at > now() - interval '2 minutes') >= 3
     or (select count(*) from public.orders o
       where o.created_at > now() - interval '1 minute') >= 60 then
    raise exception 'too_many';
  end if;

  return query
    insert into public.orders as o (table_no, items, note, lang)
    values (v_table, v_items, left(v_note, 300), left(nullif(btrim(coalesce(p_lang, '')), ''), 5))
    returning o.id, o.no;
end $$;

-- ---------- Гость смотрит статус своего заказа ----------
create or replace function public.order_status(p_id uuid)
returns table (no bigint, status text, updated_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select o.no, o.status, o.updated_at
  from public.orders o
  where o.id = p_id and o.created_at > now() - interval '1 day';
$$;

revoke all on function public.place_order(text, jsonb, text, text) from public;
revoke all on function public.order_status(uuid) from public;
revoke all on function public.is_staff() from public;
grant execute on function public.place_order(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.order_status(uuid) to anon, authenticated;
grant execute on function public.is_staff() to authenticated;

-- ---------- Заказы прилетают в админку сразу (Realtime) ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
