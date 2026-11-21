#!/bin/sh
# Тесты базы на локальном Postgres: временная база → схема (2 раза) → меню (2 раза) → проверки ролей → удаление.
# Нужен psql и запущенный Postgres. Ничего не трогает в Supabase.
set -e
cd "$(dirname "$0")/.."
DB="menu_test_$$"
cleanup() {
  psql -d postgres -qc "drop database if exists $DB" >/dev/null 2>&1 || true
  # роли anon/authenticated удаляем, только если тест их создал
  if [ "$CREATED_ROLES" = "1" ]; then psql -d postgres -qc "drop role if exists anon; drop role if exists authenticated;" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
CREATED_ROLES=$(psql -d postgres -Atc "select case when exists (select 1 from pg_roles where rolname='anon') then 0 else 1 end")
psql -d postgres -qc "create database $DB"
P="psql -d $DB -q -v ON_ERROR_STOP=1 -X"
$P -f supabase/tests/stub.sql 2>/dev/null
$P -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
$P -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
$P -f supabase/seed.sql
$P -f supabase/seed.sql
# китайский для живой базы: снимаем zh и добавляем скриптом — должно вернуться всё
$P -c "update public.dishes set name = name - 'zh', \"desc\" = \"desc\" - 'zh'; update public.categories set name = name - 'zh'; update public.settings set tagline = tagline - 'zh', footer = footer - 'zh';"
$P -f supabase/zh-translations.sql
$P -c "do \$\$ begin if exists (select 1 from public.dishes where not (name ? 'zh')) or exists (select 1 from public.categories where not (name ? 'zh')) or not (select tagline ? 'zh' from public.settings) then raise exception 'zh-translations.sql: не всё переведено'; end if; end \$\$;"
echo "  ok  китайский язык добавляется в живую базу скриптом"
$P -o /dev/null -f supabase/tests/roles.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /"
