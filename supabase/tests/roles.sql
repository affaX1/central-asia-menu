-- Проверка прав трёх ролей: гость, официант, владелец. Любой FAIL останавливает тесты.
\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;

-- одно скрытое блюдо для проверок
update public.dishes set hidden = true where id = 'jigar';

-- ============ 1. Гость ============
set role anon;
select t_ok((select count(*) from public.dishes) = 29, 'гость видит 29 опубликованных блюд');
select t_ok(not exists (select 1 from public.dishes where id = 'jigar'), 'гость не видит скрытое блюдо');
select t_ok((select name from public.settings) = 'Central Asia Restaurant', 'гость читает данные ресторана');
select t_fails($$insert into public.dishes (id, category_id, name, price) values ('x', 'plov', '{"ru":"x"}', 1)$$, 'permission denied', 'гость не может добавить блюдо');
select t_fails($$update public.dishes set price = 1$$, 'permission denied', 'гость не может менять цены');
select t_fails($$update public.settings set phone = '1'$$, 'permission denied', 'гость не может менять настройки');
select t_fails($$delete from public.categories$$, 'permission denied', 'гость не может удалять категории');
select t_fails($$select * from public.staff$$, 'permission denied', 'гость не видит сотрудников');
select t_fails($$select public.invite_staff('a@b.co', 'owner')$$, 'permission denied', 'гость не может приглашать');
select t_fails($$select public.bootstrap_owner('evil@x.co')$$, 'permission denied', 'гость не может назначить себя владельцем');
select t_fails($$insert into storage.objects (bucket_id, name) values ('menu-photos', 'x.jpg')$$, 'row-level security', 'гость не может загружать фото');
reset role;

-- ============ 2. Первый владелец ============
select t_ok(public.bootstrap_owner('Owner@Example.com', 'Хозяин') like 'owner invited%', 'владелец приглашён из SQL Editor');
insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com', '{"name":"X"}');
select t_ok((select role from public.staff where user_id = '11111111-1111-1111-1111-111111111111') = 'owner', 'приглашённый email стал владельцем при регистрации');
select t_fails($$select public.bootstrap_owner('second@x.co')$$, 'owner_exists|ok', 'второй раз назначить владельца нельзя (пока первый не подтвердил — тоже)');

-- email ещё не подтверждён: прав нет
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(not public.is_owner(), 'неподтверждённый email — не владелец');
select t_ok(public.t_rows($$update public.settings set phone = '123'$$) = 0, 'неподтверждённый владелец не меняет настройки');
reset role; reset request.jwt.claim.sub;
update auth.users set email_confirmed_at = now() where id = '11111111-1111-1111-1111-111111111111';
select t_fails($$select public.bootstrap_owner('second@x.co')$$, 'owner_exists', 'после подтверждения второй bootstrap запрещён');

-- ============ 3. Владелец работает ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.is_owner(), 'владелец подтверждён');
select t_ok((select role from public.whoami()) = 'owner', 'whoami: владелец');
select t_ok(public.t_rows($$update public.dishes set price = 31.5 where id = 'plov-tashkent'$$) = 1, 'владелец меняет цену');
select t_ok(public.t_rows($$update public.dishes set available = false where id = 'non'$$) = 1, 'владелец ставит «нет в наличии»');
select t_ok(public.t_rows($$update public.settings set phone = '+60 12 345 6789', timezone = 'Asia/Tashkent'$$) = 1, 'владелец меняет телефон и часовой пояс');
select t_fails($$update public.settings set timezone = 'Mars/Base'$$, 'bad_timezone', 'неверный часовой пояс не сохраняется');
select t_fails($$update public.settings set schedule = '[{"closed":false,"open":"25:00","close":"22:00"}]'$$, 'check', 'неверное расписание не сохраняется');
select t_ok(public.t_rows($$update public.settings set schedule = '[{"closed":false,"open":"18:00","close":"02:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"}]'$$) = 1, 'ночное расписание и выходной сохраняются');
select t_fails($$update public.settings set phone = 'call me <script>'$$, 'check', 'в телефон нельзя вписать мусор');
insert into public.categories (id, name, sort) values ('test-cat', '{"ru":"Тест"}', 999);
insert into public.dishes (id, category_id, name, price) values ('test-dish', 'test-cat', '{"ru":"Тест"}', 9.9);
select t_ok(exists (select 1 from public.dishes where id = 'test-dish'), 'владелец добавляет категорию и блюдо');
select t_fails($$insert into public.dishes (id, category_id, name, price) values ('no-name', 'test-cat', '{"ru":""}', 1)$$, 'check', 'блюдо без названия не сохраняется');
select t_fails($$insert into public.dishes (id, category_id, name, price) values ('neg', 'test-cat', '{"ru":"x"}', -5)$$, 'check', 'отрицательная цена не сохраняется');
select t_fails($$delete from public.categories where id = 'test-cat'$$, 'foreign key', 'нельзя удалить категорию, пока в ней блюда');
delete from public.dishes where id = 'test-dish';
delete from public.categories where id = 'test-cat';
select t_ok(not exists (select 1 from public.categories where id = 'test-cat'), 'владелец удаляет блюдо и пустую категорию');
insert into storage.objects (bucket_id, name) values ('menu-photos', 'dishes/plov/1.jpg');
select t_ok(true, 'владелец загружает фото');
select t_ok(exists (select 1 from public.dishes where id = 'jigar'), 'владелец видит скрытое блюдо');

-- приглашения
select t_ok(public.invite_staff('Waiter@Example.com', 'waiter', 'Азиз') = 'invited', 'владелец приглашает официанта');
select t_fails($$select public.invite_staff('not-an-email', 'waiter')$$, 'bad_email', 'кривой email не приглашается');
select t_fails($$select public.set_staff('11111111-1111-1111-1111-111111111111', 'waiter', 'X', true)$$, 'self', 'владелец не может понизить сам себя');
select t_fails($$select public.set_staff('11111111-1111-1111-1111-111111111111', 'owner', 'X', false)$$, 'self', 'владелец не может отключить сам себя');
select t_fails($$select public.remove_staff('11111111-1111-1111-1111-111111111111')$$, 'self', 'владелец не может удалить сам себя');
reset role; reset request.jwt.claim.sub;

-- ============ 4. Официант ============
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'waiter@example.com');
insert into auth.users (id, email, email_confirmed_at) values ('33333333-3333-3333-3333-333333333333', 'stranger@example.com', now());
select t_ok((select role from public.staff where user_id = '22222222-2222-2222-2222-222222222222') = 'waiter', 'приглашённый официант получил роль');
select t_ok(not exists (select 1 from public.staff where user_id = '33333333-3333-3333-3333-333333333333'), 'неприглашённый не получил доступ');

set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(not public.is_staff(), 'официант без подтверждённого email — без доступа');
reset role; reset request.jwt.claim.sub;
update auth.users set email_confirmed_at = now() where id = '22222222-2222-2222-2222-222222222222';

set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(public.is_staff() and not public.is_owner(), 'официант: сотрудник, но не владелец');
select t_ok((select count(*) from public.dishes) = 30, 'официант видит всё меню (вместе со скрытым)');
select t_ok((select available from public.dishes where id = 'non') = false, 'официант видит актуальное наличие');
select t_ok(public.t_rows($$update public.dishes set price = 1 where id = 'plov-tashkent'$$) = 0, 'официант НЕ меняет цену (прямой запрос)');
select t_ok(public.t_rows($$update public.dishes set available = true where id = 'non'$$) = 0, 'официант НЕ меняет наличие (прямой запрос)');
select t_ok(public.t_rows($$update public.dishes set photo_url = 'https://evil.example/x.jpg'$$) = 0, 'официант НЕ меняет фото');
select t_ok(public.t_rows($$delete from public.dishes$$) = 0, 'официант НЕ удаляет блюда');
select t_fails($$insert into public.dishes (id, category_id, name, price) values ('w', 'plov', '{"ru":"w"}', 1)$$, 'row-level security', 'официант НЕ добавляет блюда');
select t_ok(public.t_rows($$update public.categories set hidden = true$$) = 0, 'официант НЕ меняет категории');
select t_ok(public.t_rows($$update public.settings set phone = '000', schedule = settings.schedule$$) = 0, 'официант НЕ меняет телефон и расписание');
select t_fails($$select public.invite_staff('friend@x.co', 'owner')$$, 'forbidden', 'официант НЕ приглашает людей');
select t_fails($$select public.set_staff('22222222-2222-2222-2222-222222222222', 'owner', 'me', true)$$, 'forbidden', 'официант НЕ повышает себя до владельца');
select t_fails($$select public.remove_staff('11111111-1111-1111-1111-111111111111')$$, 'forbidden', 'официант НЕ удаляет владельца');
select t_ok((select count(*) from public.staff) = 1, 'официант видит в сотрудниках только себя');
select t_ok((select count(*) from public.staff_invites) = 0, 'официант не видит приглашения');
select t_fails($$insert into storage.objects (bucket_id, name) values ('menu-photos', 'evil.jpg')$$, 'row-level security', 'официант НЕ загружает фото');
reset role; reset request.jwt.claim.sub;

-- посторонний с подтверждённым email
set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select t_ok(not public.is_staff(), 'посторонний — не сотрудник');
select t_ok((select count(*) from public.dishes) = 29, 'посторонний видит только опубликованное, как гость');
select t_ok(public.t_rows($$update public.dishes set price = 0$$) = 0, 'посторонний ничего не меняет');
reset role; reset request.jwt.claim.sub;

-- ============ 5. Владелец отключает и удаляет ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.invite_staff('stranger@example.com', 'waiter', '') = 'added', 'приглашение уже зарегистрированного — доступ сразу');
select public.set_staff('22222222-2222-2222-2222-222222222222', 'waiter', 'Азиз', false);
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(not public.is_staff(), 'отключённый официант теряет доступ');
select t_ok((select count(*) from public.dishes) = 29, 'отключённый официант видит только опубликованное');
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.remove_staff('33333333-3333-3333-3333-333333333333');
select t_ok(not exists (select 1 from public.staff where user_id = '33333333-3333-3333-3333-333333333333'), 'владелец удаляет сотрудника');
select public.revoke_invite('nobody@x.co');
reset role; reset request.jwt.claim.sub;

select t_ok((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('dishes', 'categories', 'settings')) = 3, 'живые обновления включены для меню и настроек');
\echo ALL DATABASE TESTS PASSED
