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
$P -o /dev/null -f supabase/tests/roles.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /"
