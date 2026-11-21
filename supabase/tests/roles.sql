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


-- ============ 6. Столы и заказы ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.create_tables(1, 3) = 3, 'владелец создаёт столы 1–3');
select t_ok(public.create_tables(1, 4) = 1, 'повторное создание не дублирует столы');
insert into public.tables (label) values ('VIP');
update public.tables set active = false where label = '4';
update public.settings set orders_when_closed = true, orders_enabled = true;
update public.dishes set available = true, price = 28 where id = 'plov-tashkent';
reset role; reset request.jwt.claim.sub;

-- коды столов для тестов
create temp table tk as select label, token, id from public.tables;
grant select on tk to anon, authenticated;

-- гость
set role anon;
select t_fails($$select * from public.tables$$, 'permission denied', 'гость не видит список столов и их коды');
select t_ok((select label from public.table_info((select token from tk where label = '2'))) = '2', 'гость проверяет свой стол по QR');
select t_ok(not exists (select 1 from public.table_info('0000000000000000000a')), 'неверный QR — стол не найден');
select t_ok(not exists (select 1 from public.table_info((select token from tk where label = '4'))), 'отключённый стол не принимается');

create temp table o1 as select * from public.place_order((select token from tk where label = '2'),
  '[{"id":"plov-tashkent","qty":2,"price":28},{"id":"green-tea","qty":1,"price":10}]', 'без лука', 'ru',
  'aaaaaaaa-0000-0000-0000-000000000001');
grant select on o1 to authenticated;
select t_ok((select total from o1) = 66 and (select table_label from o1) = '2' and (select status from o1) = 'new', 'гость отправил заказ: сумма 66 по ценам сервера, стол 2, статус «новый»');
select t_ok((select no from public.place_order((select token from tk where label = '2'),
  '[{"id":"plov-tashkent","qty":9,"price":28}]', null, 'ru', 'aaaaaaaa-0000-0000-0000-000000000001')) = (select no from o1),
  'повторная отправка с тем же ключом возвращает тот же заказ, а не новый');
select t_ok((select count(*) from public.get_order((select id from o1), (select guest_token from o1))) = 1, 'гость видит свой заказ по секрету');
select t_ok((select count(*) from public.get_order((select id from o1), gen_random_uuid())) = 0, 'с чужим секретом заказ не виден');
select t_fails($$select * from public.orders$$, 'permission denied', 'гость не читает заказы напрямую');
select t_fails($$update public.orders set status = 'ready'$$, 'permission denied', 'гость не меняет статус');
select t_fails($$select public.accept_order((select id from o1))$$, 'permission denied', 'гость не может принять заказ');
select t_fails($$select * from public.place_order('0000000000000000000a', '[{"id":"non","qty":1,"price":5}]', null, 'ru', gen_random_uuid())$$, 'bad_table', 'заказ с неверного QR не создаётся');
select t_fails($$select * from public.place_order((select token from tk where label = '4'), '[{"id":"lagman-soup","qty":1,"price":24}]', null, 'ru', gen_random_uuid())$$, 'bad_table', 'заказ с отключённого стола не создаётся');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[]', null, 'ru', gen_random_uuid())$$, 'empty', 'пустой заказ не создаётся');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"non","qty":1,"price":5}]', null, 'ru', gen_random_uuid())$$, 'unavailable:non', 'блюдо «нет в наличии» заказать нельзя');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"jigar","qty":1,"price":22}]', null, 'ru', gen_random_uuid())$$, 'unavailable:jigar', 'скрытое блюдо заказать нельзя');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":1,"price":1}]', null, 'ru', gen_random_uuid())$$, 'price_changed:plov-tashkent', 'подставная или устаревшая цена не проходит');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":0,"price":28}]', null, 'ru', gen_random_uuid())$$, 'bad_items', 'количество 0 не проходит');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":1,"price":28},{"id":"plov-tashkent","qty":1,"price":28}]', null, 'ru', gen_random_uuid())$$, 'bad_items', 'одно блюдо дважды не проходит');
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":1,"price":28}]', null, 'ru', null)$$, 'bad_request', 'без ключа защиты от повтора не проходит');
reset role;

-- закрыто / приём выключен
update public.settings set orders_when_closed = false, schedule = '[{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"}]';
set role anon;
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":1,"price":28}]', null, 'ru', gen_random_uuid())$$, 'closed', 'когда ресторан закрыт, заказ не создаётся');
reset role;
update public.settings set orders_when_closed = true, orders_enabled = false;
set role anon;
select t_fails($$select * from public.place_order((select token from tk where label = '1'), '[{"id":"plov-tashkent","qty":1,"price":28}]', null, 'ru', gen_random_uuid())$$, 'orders_off', 'когда приём заказов выключен, заказ не создаётся');
reset role;
update public.settings set orders_enabled = true;

-- расписание в базе (Куала-Лумпур, UTC+8): пн 10–22, вт выходной, ср 18–02
update public.settings set timezone = 'Asia/Kuala_Lumpur', schedule = '[{"closed":false,"open":"10:00","close":"22:00"},{"closed":true,"open":"10:00","close":"22:00"},{"closed":false,"open":"18:00","close":"02:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"},{"closed":false,"open":"10:00","close":"22:00"}]';
select t_ok(public.restaurant_open('2026-11-16 02:00+00'), 'пн 10:00 по Куала-Лумпуру — открыто');
select t_ok(not public.restaurant_open('2026-11-16 01:59+00'), 'пн 09:59 — закрыто');
select t_ok(not public.restaurant_open('2026-11-16 14:00+00'), 'пн 22:00 — закрыто');
select t_ok(not public.restaurant_open('2026-11-17 04:00+00'), 'вт (выходной) 12:00 — закрыто');
select t_ok(public.restaurant_open('2026-11-18 17:30+00'), 'ср→чт 01:30 ночью — ещё открыто (ночная смена)');
select t_ok(not public.restaurant_open('2026-11-18 18:00+00'), 'чт 02:00 — ночная смена закончилась');

-- спам с одного стола
update public.settings set orders_when_closed = true;
set role anon;
select public.place_order((select token from tk where label = '3'), '[{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid()) from generate_series(1, 5);
select t_fails($$select * from public.place_order((select token from tk where label = '3'), '[{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid())$$, 'too_many', 'шестой заказ со стола за 5 минут не проходит');
reset role;

-- официант: заказы и столы ему недоступны
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
reset role; update public.staff set active = true where user_id = '22222222-2222-2222-2222-222222222222';
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(public.is_staff(), 'официант снова с доступом');
select t_ok((select count(*) from public.orders) = 6, 'официант видит заказы ресторана');
select t_ok(public.t_rows($$update public.orders set status = 'cancelled'$$) = 0, 'официант не меняет статусы заказов прямым запросом');
select t_fails($$update public.orders set total = 0$$, 'permission denied', 'официант не меняет сумму заказа');
create temp table acc1 as select * from public.accept_order((select id from o1));
select t_ok((select changed from acc1) and (select status from acc1) = 'accepted' and (select accepted_by_name from acc1) = 'Азиз', 'официант принимает новый заказ, записано кто принял');
select t_ok((select not changed and status = 'accepted' from public.accept_order((select id from o1))), 'второе принятие того же заказа ничего не меняет и возвращает актуальный статус');
select t_fails($$select public.accept_order(gen_random_uuid())$$, 'not_found', 'несуществующий заказ принять нельзя');
select t_ok(public.t_rows($$update public.settings set halal = true$$) = 0, 'официант не меняет «халяль»');
select t_ok(public.t_rows($$update public.dishes set meat = '{beef}' where id = 'shurpa'$$) = 0, 'официант не меняет вид мяса');
select t_ok((select count(*) from public.tables) = 0, 'официант не видит столы и коды QR');
select t_fails($$insert into public.tables (label) values ('W')$$, 'row-level security', 'официант не создаёт столы');
select t_fails($$select public.create_tables(10, 12)$$, 'forbidden', 'официант не создаёт столы функцией');
select t_fails($$select public.reset_table_token((select id from tk where label = '1'))$$, 'forbidden', 'официант не меняет QR столов');
reset role; reset request.jwt.claim.sub;

-- владелец ведёт заказ
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok((select count(*) from public.orders) = 6, 'владелец видит все заказы');
select t_ok(public.t_rows($$update public.orders set status = 'accepted' where id = (select id from o1)$$) = 1, 'владелец тоже может менять статус');
select t_ok(public.t_rows($$update public.orders set status = 'ready' where id = (select id from o1)$$) = 1, 'владелец ставит «готов»');
select t_fails($$update public.orders set status = 'paid' where id = (select id from o1)$$, 'check', 'несуществующий статус не сохраняется');
select t_fails($$update public.orders set total = 1 where id = (select id from o1)$$, 'permission denied', 'сумму заказа не может изменить даже владелец');
select t_ok((select accepted_at is not null and ready_at is not null and accepted_by = '22222222-2222-2222-2222-222222222222' and status_by = '11111111-1111-1111-1111-111111111111' from public.orders where id = (select id from o1)), 'время, кто принял и кто менял статус записаны');
select t_ok(public.t_rows($$update public.dishes set meat = '{lamb}' where id = 'shurpa'$$) = 1, 'владелец указывает вид мяса');
select t_fails($$update public.dishes set meat = '{pork}' where id = 'shurpa'$$, 'check', 'неизвестный вид мяса не сохраняется');
select t_ok(public.t_rows($$update public.settings set halal = true, halal_note = '{"ru":"тест"}'$$) = 1, 'владелец отмечает «халяль»');
select t_ok((select min(no) from public.orders) >= 1001 and (select count(distinct no) = count(*) from public.orders), 'номера заказов уникальны и начинаются с 1001');
select t_ok(public.reset_table_token((select id from tk where label = '2')) <> (select token from tk where label = '2'), 'владелец выпускает новый QR для стола');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select status from public.get_order((select id from o1), (select guest_token from o1))) = 'ready', 'гость видит новый статус «готов»');
select t_ok(not exists (select 1 from public.table_info((select token from tk where label = '2'))), 'старый QR стола после замены не работает');
reset role;

select t_ok((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('dishes', 'categories', 'settings', 'orders', 'tables')) = 5, 'живые обновления включены для меню, настроек, заказов и столов');

-- ============ 7. Повар, сбор и налог, варианты блюд ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.invite_staff('Cook@Example.com', 'cook', 'Повар Бахтиёр') = 'invited', 'владелец приглашает повара');
select t_fails($$select public.invite_staff('x@y.co', 'boss')$$, 'bad_role', 'неизвестная роль не приглашается');
update public.settings set service_pct = 10, tax_pct = 6, tax_on_service = true;
update public.dishes set price = 28, available = true,
  options = '[{"id":"portion","name":{"ru":"Порция"},"required":true,"choices":[{"id":"full","name":{"ru":"Целая"},"price":0},{"id":"half","name":{"ru":"Половина"},"price":-10}]},{"id":"extra","name":{"ru":"Добавки"},"multi":true,"choices":[{"id":"egg","name":{"ru":"Яйцо"},"price":3},{"id":"meat","name":{"ru":"Мясо"},"price":8}]}]'
  where id = 'plov-samarkand';
select t_fails($$update public.dishes set options = '[{"id":"x"}]' where id = 'shurpa'$$, 'check', 'кривые варианты блюда не сохраняются');
select t_fails($$update public.settings set service_pct = 50$$, 'check', 'сервисный сбор больше 30% не сохраняется');
reset role; reset request.jwt.claim.sub;
insert into auth.users (id, email, email_confirmed_at) values ('44444444-4444-4444-4444-444444444444', 'cook@example.com', now());
select t_ok((select role from public.staff where user_id = '44444444-4444-4444-4444-444444444444') = 'cook', 'приглашённый повар получил роль');
create temp table tv as select label, token, id from public.tables;
grant select on tv to anon, authenticated;

set role anon;
create temp table o7 as select * from public.place_order((select token from tv where label = '1'),
  '[{"id":"plov-tashkent","qty":1,"price":28}]', null, 'ru', 'bbbbbbbb-0000-0000-0000-000000000001');
grant select on o7 to authenticated;
select t_ok((select subtotal from o7) = 28 and (select service from o7) = 2.80 and (select tax from o7) = 1.85 and (select total from o7) = 32.65,
  'сервисный сбор 10% и налог 6% (и на сбор) считает сервер: 28 → 32.65');
create temp table o8 as select * from public.place_order((select token from tv where label = '1'),
  '[{"id":"plov-samarkand","qty":2,"price":21,"opts":["portion:half","extra:egg"]},{"id":"plov-samarkand","qty":1,"price":28,"opts":["portion:full"]}]', null, 'ru', gen_random_uuid());
grant select on o8 to authenticated;
select t_ok((select subtotal from o8) = 70 and jsonb_array_length((select items from o8) -> 0 -> 'opts') = 2 and ((select items from o8) -> 0 ->> 'price')::numeric = 21,
  'варианты: половина порции (−10) + яйцо (+3) = 21 за штуку; одно блюдо с разными вариантами в одном заказе');
select t_fails($$select * from public.place_order((select token from tv where label = '1'), '[{"id":"plov-samarkand","qty":1,"price":28}]', null, 'ru', gen_random_uuid())$$, 'options:plov-samarkand', 'без обязательного варианта заказ не проходит');
select t_fails($$select * from public.place_order((select token from tv where label = '1'), '[{"id":"plov-samarkand","qty":1,"price":18,"opts":["portion:full","portion:half"]}]', null, 'ru', gen_random_uuid())$$, 'options:plov-samarkand', 'два варианта в одиночной группе не проходят');
select t_fails($$select * from public.place_order((select token from tv where label = '1'), '[{"id":"plov-samarkand","qty":1,"price":28,"opts":["portion:full","extra:gold"]}]', null, 'ru', gen_random_uuid())$$, 'options:plov-samarkand', 'несуществующий вариант не проходит');
select t_fails($$select * from public.place_order((select token from tv where label = '1'), '[{"id":"plov-samarkand","qty":1,"price":28,"opts":["portion:half"]}]', null, 'ru', gen_random_uuid())$$, 'price_changed:plov-samarkand', 'цена без учёта варианта не проходит');
select t_fails($$select * from public.place_order((select token from tv where label = '1'), '[{"id":"green-tea","qty":1,"price":10,"opts":["portion:full"]}]', null, 'ru', gen_random_uuid())$$, 'options:green-tea', 'чужой вариант у другого блюда не проходит');
select t_ok((select service from public.get_order((select id from o7), (select guest_token from o7))) = 2.80, 'гость видит сбор и налог в своём заказе');

-- ============ 8. Вызов официанта ============
create temp table c1 as select * from public.call_staff((select token from tv where label = '1'), 'waiter');
grant select on c1 to authenticated;
select t_ok((select id from public.call_staff((select token from tv where label = '1'), 'waiter')) = (select id from c1), 'повторное «позвать официанта» не создаёт второй вызов');
select t_ok((select kind from public.call_staff((select token from tv where label = '1'), 'bill', 'card')) = 'bill', 'гость просит счёт картой');
select t_ok((select count(*) from public.table_calls((select token from tv where label = '1'))) = 2, 'гость видит два открытых вызова своего стола');
select t_fails($$select * from public.call_staff('0000000000000000000a', 'waiter')$$, 'bad_table', 'вызов с неверного QR не проходит');
select t_fails($$select * from public.call_staff((select token from tv where label = '1'), 'dance')$$, 'bad_request', 'неизвестный вызов не проходит');
select t_fails($$select * from public.calls$$, 'permission denied', 'гость не читает вызовы других столов');
select t_fails($$select public.done_call((select id from c1))$$, 'permission denied', 'гость не закрывает вызовы');
select t_fails($$select * from public.floor_tables()$$, 'permission denied', 'гость не видит список столов зала');
reset role;

set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_ok(public.is_staff() and public.is_kitchen() and not public.is_floor(), 'повар: кухня, но не зал');
select t_ok((select count(*) from public.calls) = 0, 'повар не видит вызовы зала');
select t_fails($$select public.done_call((select id from c1))$$, 'forbidden', 'повар не закрывает вызовы');
select t_fails($$select * from public.accept_order((select id from o7))$$, 'forbidden', 'повар не принимает заказы у гостей');
select t_fails($$select * from public.close_bill((select id from tv where label = '1'), 'cash')$$, 'forbidden', 'повар не закрывает счета');
select t_ok(public.t_rows($$update public.dishes set price = 1$$) = 0, 'повар не меняет меню');
select t_ok((select count(*) from public.orders) > 0, 'повар видит заказы для кухни');
reset role; reset request.jwt.claim.sub;

set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select count(*) from public.calls where done_at is null) = 2, 'официант видит открытые вызовы');
select t_ok((select count(*) from public.floor_tables()) >= 4 and not exists (select 1 from information_schema.columns where table_name = 'floor_tables'), 'официант видит столы зала (без кодов QR)');
select public.done_call((select id from c1));
select t_ok((select done_by_name from public.calls where id = (select id from c1)) = 'Азиз', 'официант закрыл вызов, записано кто');

-- ============ 9. Счёт и оплата ============
select public.accept_order(id) from public.orders where table_id = (select id from tv where label = '1') and status = 'new';
select t_fails($$select * from public.close_bill((select id from tv where label = '1'), 'bitcoin')$$, 'bad_method', 'неизвестный способ оплаты не проходит');
create temp table b1 as select * from public.close_bill((select id from tv where label = '1'), 'card');
select t_ok((select total from b1) = (select sum(total) from public.orders where table_id = (select id from tv where label = '1') and status <> 'cancelled')
  and (select paid_by_name from b1) = 'Азиз' and cardinality((select order_ids from b1)) = 2, 'официант закрыл счёт стола: все заказы стола в одном счёте, сумма сервера');
select t_ok(not exists (select 1 from public.orders where table_id = (select id from tv where label = '1') and paid_at is null and status <> 'cancelled'), 'заказы стола отмечены оплаченными');
select t_fails($$select * from public.close_bill((select id from tv where label = '1'), 'cash')$$, 'nothing_to_pay', 'второй раз тот же счёт не закрывается');
select t_fails($$update public.orders set paid_at = null$$, 'permission denied', 'официант не снимает оплату прямым запросом');
select t_ok((select count(*) from public.bills) = 1, 'официант видит счета');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select count(*) from public.table_calls((select token from tv where label = '1'))) = 0, 'после оплаты вызов «счёт» закрылся сам');
select t_fails($$select * from public.bills$$, 'permission denied', 'гость не видит счета');
select t_ok((select paid_at is not null from public.get_order((select id from o7), (select guest_token from o7))), 'гость видит, что заказ оплачен');
create temp table o9 as select * from public.place_order((select token from tv where label = 'VIP'),
  '[{"id":"plov-tashkent","qty":2,"price":28}]', null, 'ru', gen_random_uuid());
grant select on o9 to authenticated;
reset role;

-- ============ 10. Кухня ============
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_ok((select status from public.kitchen_set((select id from o9), 'cooking')) = 'new', 'непринятый заказ кухня не берёт');
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.accept_order((select id from o9));
select t_fails($$select * from public.kitchen_set((select id from o9), 'cooking')$$, 'forbidden', 'официант не ведёт кухню');
reset role; set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_ok((select status from public.kitchen_set((select id from o9), 'cooking')) = 'cooking', 'повар: «готовится»');
select t_ok((select status from public.kitchen_set((select id from o9), 'ready')) = 'ready', 'повар: «готово»');
select t_fails($$select * from public.kitchen_set((select id from o9), 'cancelled')$$, 'bad_status', 'повар не отменяет заказы');
select t_ok((select cooking_at is not null and ready_at is not null from public.orders where id = (select id from o9)), 'время начала и готовности записано');
reset role; reset request.jwt.claim.sub;

-- ============ 11. Изменение заказа ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.dishes set price = 30 where id = 'plov-tashkent';
create temp table e1 as select * from public.edit_order((select id from o9), '[{"id":"plov-tashkent","qty":3},{"id":"green-tea","qty":1}]');
select t_ok((select subtotal from e1) = 94 and (select edited_by_name from e1) = 'Хозяин' and (select total from e1) = 109.60,
  'владелец меняет заказ: старая позиция по старой цене (28×3), новая по текущей (10), сбор и налог пересчитаны');
select t_fails($$select * from public.edit_order((select id from o9), '[]')$$, 'empty', 'пустой заказ после изменения не сохраняется (для этого есть «Отменить»)');
select t_fails($$select * from public.edit_order((select id from o9), '[{"id":"non","qty":1}]')$$, 'unavailable:non', 'добавить блюдо «нет в наличии» нельзя');
select t_fails($$select * from public.edit_order((select id from o7), '[{"id":"plov-tashkent","qty":1}]')$$, 'paid', 'оплаченный заказ не меняется');
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select * from public.edit_order((select id from o9), '[{"id":"plov-tashkent","qty":1}]')$$, 'forbidden', 'официант не меняет состав заказа');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select edited_at is not null and total = 109.60 from public.get_order((select id from o9), (select guest_token from o9))), 'гость видит изменённый заказ');
reset role;

-- ============ 12. Журнал изменений ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(exists (select 1 from public.audit_log where entity = 'dish' and entity_id = 'plov-tashkent' and who = 'Хозяин'
  and changes -> 'price' = '[28, 30]'::jsonb), 'журнал: владелец поменял цену 28 → 30');
select t_ok(exists (select 1 from public.audit_log where entity = 'bill' and who = 'Азиз'), 'журнал: официант закрыл счёт');
select t_ok(exists (select 1 from public.audit_log where entity = 'table' and changes ? 'token'), 'журнал: замена QR стола записана');
select t_ok(not exists (select 1 from public.audit_log a, tk where a.changes::text like '%' || tk.token || '%'), 'в журнал не попадают секретные коды столов');
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select count(*) from public.audit_log) = 0, 'официант не видит журнал');
reset role; set role anon;
select t_fails($$select * from public.audit_log$$, 'permission denied', 'гость не видит журнал');
reset role;

-- ============ 13. Telegram ============
set role anon;
select t_fails($$select * from private.telegram$$, 'permission denied', 'гость не видит токен Telegram');
select t_fails($$select public.set_telegram('1:x', '{1}', true, true, true)$$, 'permission denied', 'гость не подключает Telegram');
reset role; set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select * from public.telegram_status()$$, 'forbidden', 'официант не видит настройки Telegram');
select t_fails($$select * from private.telegram$$, 'permission denied', 'официант не видит токен Telegram');
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_fails($$select public.set_telegram('not-a-token', '{123456}', true, true, false)$$, 'bad_token', 'кривой токен бота не сохраняется');
select t_fails($$select public.set_telegram('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12', '{abc}', true, true, false)$$, 'bad_chat', 'кривой чат не сохраняется');
select public.set_telegram('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12', '{987654321}', true, true, true);
select t_ok((select connected and bot_hint = '…ef12' and chats = 1 from public.telegram_status()), 'владелец подключил Telegram; наружу виден только хвост токена');
select t_ok(public.telegram_test() = 1, 'проверочное сообщение уходит');
reset role; reset request.jwt.claim.sub;
set role anon;
select public.place_order((select token from tv where label = 'VIP'), '[{"id":"green-tea","qty":1,"price":10}]', 'тест', 'ru', gen_random_uuid());
select public.call_staff((select token from tv where label = 'VIP'), 'bill', 'cash');
reset role;
select t_ok(exists (select 1 from net.sent where url like '%/bot123456:%/sendMessage' and body ->> 'text' like 'Новый заказ №%стол VIP%Зелёный%'), 'новый заказ ушёл в Telegram');
select t_ok(exists (select 1 from net.sent where body ->> 'text' = 'Стол VIP: просят счёт (наличные)' and body ->> 'chat_id' = '987654321'), 'вызов «счёт» ушёл в Telegram');
-- Telegram сломался — заказ всё равно создаётся
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language plpgsql as $$ begin raise exception 'network down'; end $$;
set role anon;
select t_ok((select count(*) from public.place_order((select token from tv where label = 'VIP'), '[{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid())) = 1, 'если Telegram недоступен, заказ всё равно принимается');
reset role;
select t_ok((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('calls', 'bills')) = 2, 'живые обновления включены для вызовов и счетов');

-- ============ 14. Официант: заказ за гостя, «подано», мои столы ============
-- вернём рабочий net.http_post (в прошлом блоке его «сломали»)
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.sent (url, body) values (url, body) returning id $$;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table s1 as select * from public.staff_place_order((select id from tv where label = '2'),
  '[{"id":"plov-tashkent","qty":2},{"id":"plov-samarkand","qty":1,"opts":["portion:half"]}]', 'гость без телефона', 'cccccccc-0000-0000-0000-000000000001');
select t_ok((select status from s1) = 'accepted' and (select source from s1) = 'staff' and (select accepted_by_name from s1) = 'Азиз' and (select subtotal from s1) = 78,
  'официант сам пробил заказ: сразу «принят», цены сервера (30×2 + 18), записано кто');
select t_ok((select no from public.staff_place_order((select id from tv where label = '2'), '[{"id":"green-tea","qty":9}]', null, 'cccccccc-0000-0000-0000-000000000001')) = (select no from s1),
  'повторная отправка официантом не создаёт второй заказ');
select t_fails($$select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"non","qty":1}]', null, gen_random_uuid())$$, 'unavailable:non', 'официант не пробьёт блюдо «нет в наличии»');
select t_fails($$select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"plov-samarkand","qty":1}]', null, gen_random_uuid())$$, 'options:plov-samarkand', 'официант не пробьёт блюдо без обязательного варианта');
select t_fails($$select * from public.staff_place_order((select id from tv where label = '4'), '[{"id":"green-tea","qty":1}]', null, gen_random_uuid())$$, 'bad_table', 'на отключённый стол заказ не пробивается');
select t_ok((select status from public.serve_order((select id from s1))) = 'served', 'официант отметил «подано»');
select t_ok((select served_at is not null from public.orders where id = (select id from s1)), 'время подачи записано');
select t_ok((select status from public.serve_order((select id from s1))) = 'served', 'повторное «подано» ничего не ломает');
select public.claim_table((select id from tv where label = '2'), true);
select t_ok((select waiter_name from public.floor_tables() where label = '2') = 'Азиз', 'официант взял стол 2 себе');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_fails($$select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"green-tea","qty":1}]', null, gen_random_uuid())$$, 'forbidden', 'повар не пробивает заказы');
select t_fails($$select * from public.serve_order((select id from s1))$$, 'forbidden', 'повар не отмечает «подано»');
select t_fails($$select public.claim_table((select id from tv where label = '3'), true)$$, 'forbidden', 'повар не берёт столы');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_fails($$select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"green-tea","qty":1}]', null, gen_random_uuid())$$, 'permission denied', 'гость не может пробить заказ как официант');
select t_fails($$select * from public.table_waiters$$, 'permission denied', 'гость не видит, кто обслуживает столы');
reset role;

-- ============ 15. Чаевые и раздельная оплата ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table b2 as select * from public.close_bill((select id from tv where label = '2'), 'mixed', null, 10,
  jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 50), jsonb_build_object('method', 'card', 'amount', (select sum(total) from public.orders where table_id = (select id from tv where label = '2') and paid_at is null and status <> 'cancelled') + 10 - 50)));
select t_ok((select tip from b2) = 10 and (select method from b2) = 'mixed' and jsonb_array_length((select payments from b2)) = 2, 'раздельная оплата: 50 наличными + остаток картой, чаевые 10');
reset role; set role anon;
create temp table o10 as select * from public.place_order((select token from tv where label = 'VIP'), '[{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid());
grant select on o10 to authenticated;
reset role;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.accept_order(id) from public.orders where table_id = (select id from tv where label = 'VIP') and status = 'new';
select t_fails($$select * from public.close_bill((select id from tv where label = 'VIP'), 'mixed', null, 0, '[{"method":"cash","amount":1}]')$$, 'bad_payments', 'части оплаты не сходятся с суммой — счёт не закрывается');
select t_fails($$select * from public.close_bill((select id from tv where label = 'VIP'), 'cash', null, -5)$$, 'bad_tip', 'отрицательные чаевые не проходят');
select t_fails($$select * from public.close_bill((select id from tv where label = 'VIP'), 'cash', null, 0, '[{"method":"gold","amount":10}]')$$, 'bad_payments', 'неизвестный способ в части оплаты не проходит');
create temp table b3 as select * from public.close_bill((select id from tv where label = 'VIP'), 'cash', array[(select id from o10)], 2);
select t_ok((select cardinality(order_ids) from b3) = 1 and (select tip from b3) = 2 and (select total from b3) = (select total from o10), 'оплата одного заказа стола отдельно (каждый платит за свой)');
select t_ok(exists (select 1 from public.orders where table_id = (select id from tv where label = 'VIP') and paid_at is null and status <> 'cancelled'), 'остальные заказы стола остались неоплаченными');
reset role; reset request.jwt.claim.sub;

-- ============ 16. Telegram сотрудника ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table tgc as select * from public.my_telegram_start();
select t_ok((select code from tgc) like 'ca%', 'официант получил код для подключения Telegram');
select t_ok(public.my_telegram_check() = 'pending', 'сервер спросил у Telegram новые сообщения');
reset role; reset request.jwt.claim.sub;
insert into net._http_response (id, status_code, content)
  select req, 200, json_build_object('ok', true, 'result', json_build_array(json_build_object('message', json_build_object('text', '/start ' || (select code from tgc), 'chat', json_build_object('id', 555000111)))))::text
  from private.staff_tg where user_id = '22222222-2222-2222-2222-222222222222';
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(public.my_telegram_check() = 'linked', 'Telegram официанта подключён по коду');
select t_ok((select linked from public.my_telegram()), 'официант видит: Telegram подключён');
select t_fails($$select * from private.staff_tg$$, 'permission denied', 'официант не видит чаты других');
reset role; reset request.jwt.claim.sub;
set role anon;
select public.call_staff((select token from tv where label = '2'), 'waiter');
reset role;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '555000111' and body ->> 'text' = 'Стол 2: зовут официанта'), 'вызов со стола 2 пришёл официанту этого стола в Telegram');
set role anon;
select public.call_staff((select token from tv where label = '3'), 'waiter');
reset role;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '555000111' and body ->> 'text' = 'Стол 3: зовут официанта'), 'вызов с ничьего стола приходит всем официантам с Telegram');
-- повар подключён — получает заказы на кухню
insert into private.staff_tg (user_id, chat_id) values ('44444444-4444-4444-4444-444444444444', '777000222');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table s2 as select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"green-tea","qty":2}]', null, gen_random_uuid());
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '777000222' and body ->> 'text' like 'На кухню: заказ №%стол 2%'), 'заказ официанта пришёл повару в Telegram');
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.kitchen_set((select id from s2), 'ready');
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '555000111' and body ->> 'text' like 'Готово: заказ №%стол 2 — отнесите'), 'кухня отметила «готово» — официант стола получил Telegram');
-- имя бота
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok((select bot_username from public.telegram_status()) is null, 'имя бота ещё не известно — запрос ушёл');
reset role; reset request.jwt.claim.sub;
insert into net._http_response (id, status_code, content) select getme_req, 200, '{"ok":true,"result":{"username":"central_asia_bot"}}' from private.telegram;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok((select bot_username from public.telegram_status()) = 'central_asia_bot' and (select staff_linked from public.telegram_status()) = 2, 'владелец видит имя бота и сколько сотрудников подключено');
reset role; reset request.jwt.claim.sub;
select t_ok((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'table_waiters') = 1, 'живые обновления включены для «моих столов»');

-- ============ 17. Гость: просьбы, счёт стола, отзыв, «с этим берут» ============
set role anon;
select t_ok((select kind from public.call_staff((select token from tv where label = '1'), 'waiter', null, 'water')) = 'waiter', 'гость просит воду');
select t_ok((select id from public.call_staff((select token from tv where label = '1'), 'waiter', null, 'water')) = (select id from public.call_staff((select token from tv where label = '1'), 'waiter', null, 'water')), 'повторная просьба воды не дублируется');
select t_ok((select count(*) from public.table_calls((select token from tv where label = '1')) where reason = 'water') = 1, 'гость видит свою просьбу');
select t_fails($$select * from public.call_staff((select token from tv where label = '1'), 'waiter', null, 'vodka')$$, 'bad_request', 'неизвестная просьба не проходит');
select t_fails($$select * from public.call_staff((select token from tv where label = '1'), 'bill', 'cash', 'water')$$, 'bad_request', 'просьба только к вызову официанта');
reset role;
select t_ok(exists (select 1 from net.sent where body ->> 'text' = 'Стол 1: зовут официанта — вода'), 'просьба «вода» ушла в Telegram с пояснением');

set role anon;
create temp table o11 as select * from public.place_order((select token from tv where label = '2'), '[{"id":"green-tea","qty":2,"price":10}]', null, 'ru', gen_random_uuid());
grant select on o11 to authenticated;
select t_ok((select count(*) from public.table_bill((select token from tv where label = '2'))) >= 1 and exists (select 1 from public.table_bill((select token from tv where label = '2')) where no = (select no from o11)), 'гость видит неоплаченные заказы своего стола');
select t_ok(not exists (select 1 from public.table_bill((select token from tv where label = '1'))), 'оплаченные заказы в счёт стола не попадают');
select t_ok(not exists (select 1 from public.table_bill('0000000000000000000a')), 'по чужому коду счёт не виден');
select t_fails($$select public.leave_review((select id from o11), (select guest_token from o11), 5, 'спасибо', 'ru')$$, 'too_early', 'отзыв на непринятый заказ нельзя');
reset role;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.accept_order((select id from o11));
reset role; reset request.jwt.claim.sub;
set role anon;
select public.leave_review((select id from o11), (select guest_token from o11), 4, 'Вкусно, но долго', 'ru');
select public.leave_review((select id from o11), (select guest_token from o11), 5, 'Вкусно!', 'ru');
select t_fails($$select public.leave_review((select id from o11), gen_random_uuid(), 1, 'плохо', 'ru')$$, 'not_found', 'отзыв без секрета заказа не принимается');
select t_fails($$select public.leave_review((select id from o11), (select guest_token from o11), 9, null, 'ru')$$, 'bad_rating', 'оценка только от 1 до 5');
select t_fails($$select * from public.reviews$$, 'permission denied', 'гость не читает отзывы');
select t_ok(jsonb_typeof(public.menu_stats() -> 'popular') = 'array' and (public.menu_stats() -> 'popular') ? 'green-tea', '«Хиты» по продажам считаются (зелёный чай среди популярных)');
select t_ok((public.menu_stats() -> 'pairs' -> 'plov-tashkent') ? 'green-tea', '«С этим берут»: к ташкентскому плову берут зелёный чай');
reset role;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok((select count(*) from public.reviews where order_id = (select id from o11)) = 1 and (select rating from public.reviews where order_id = (select id from o11)) = 5, 'один отзыв на заказ, гость поправил оценку');
select t_ok(public.t_rows($$update public.dishes set prep_min = 20, pairs = '{achichuk,green-tea}' where id = 'plov-tashkent'$$) = 1, 'владелец указывает время готовки и «с этим берут»');
select t_fails($$update public.dishes set prep_min = 999 where id = 'shurpa'$$, 'check', 'время готовки больше 4 часов не сохраняется');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select count(*) from public.reviews) = 0, 'официант не видит отзывы');
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'text' like 'Отзыв · стол 2%★★★★☆%'), 'отзыв ушёл владельцу в Telegram');

-- ============ 18. «Принесите счёт» — всем официантам ============
insert into auth.users (id, email, email_confirmed_at) values ('55555555-5555-5555-5555-555555555555', 'waiter2@example.com', now());
insert into public.staff (user_id, email, name, role, active) values ('55555555-5555-5555-5555-555555555555', 'waiter2@example.com', 'Дилшод', 'waiter', true);
insert into private.staff_tg (user_id, chat_id) values ('55555555-5555-5555-5555-555555555555', '999000333');
set role anon;
select public.call_staff((select token from tv where label = '2'), 'bill', 'card');
select public.call_staff((select token from tv where label = '2'), 'waiter', null, 'ice');
reset role;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '999000333' and body ->> 'text' = 'Стол 2: просят счёт (карта)')
  and exists (select 1 from net.sent where body ->> 'chat_id' = '555000111' and body ->> 'text' = 'Стол 2: просят счёт (карта)'), '«принесите счёт» пришёл всем официантам, даже если стол чужой');
select t_ok(not exists (select 1 from net.sent where body ->> 'chat_id' = '999000333' and body ->> 'text' like 'Стол 2: зовут официанта — лёд'), 'обычная просьба («лёд») — только официанту стола');

-- ============ 19. Завтрак: время подачи категории ============
select t_ok(public.category_open('06:00', '11:00', '2026-11-16 00:30+00'), 'завтрак 06–11: в 08:30 по Куала-Лумпуру — подаётся');
select t_ok(not public.category_open('06:00', '11:00', '2026-11-16 04:00+00'), 'в 12:00 завтрак уже не подаётся');
select t_ok(public.category_open('22:00', '02:00', '2026-11-16 17:00+00'), 'ночное меню 22–02: в 01:00 подаётся');
select t_ok(public.category_open(null, null), 'категория без часов подаётся всегда');
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_fails($$update public.categories set avail_from = '25:00', avail_to = '11:00' where id = 'salads'$$, 'check', 'неверное время категории не сохраняется');
select t_fails($$update public.categories set avail_from = '06:00' where id = 'salads'$$, 'check', 'нужны оба времени — начало и конец');
-- окно, которое точно закрыто сейчас: 1 минута, час назад
select t_ok(public.t_rows(format($f$update public.categories set avail_from = %L, avail_to = %L where id = 'drinks'$f$,
  to_char((now() at time zone 'Asia/Kuala_Lumpur') - interval '1 hour', 'HH24:MI'),
  to_char((now() at time zone 'Asia/Kuala_Lumpur') - interval '59 minutes', 'HH24:MI'))) = 1, 'владелец ставит время подачи категории');
reset role; reset request.jwt.claim.sub;
update public.settings set timezone = 'Asia/Kuala_Lumpur';
set role anon;
select t_fails($$select * from public.place_order((select token from tv where label = 'VIP'), '[{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid())$$, 'not_now:green-tea', 'блюдо не в своё время заказать нельзя');
reset role;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select * from public.staff_place_order((select id from tv where label = 'VIP'), '[{"id":"green-tea","qty":1}]', null, gen_random_uuid())$$, 'not_now:green-tea', 'официант тоже не пробьёт блюдо не в своё время');
reset role; reset request.jwt.claim.sub;
update public.categories set avail_from = null, avail_to = null where id = 'drinks';
-- ============ 20. Пожелание гостя к блюду ============
create temp table o20 as select * from public.place_order((select token from tv where label = 'VIP'),
  '[{"id":"green-tea","qty":1,"price":10,"note":"  без   сахара,\n диабет "},{"id":"green-tea","qty":2,"price":10}]', 'аллергия на орехи', 'ru', gen_random_uuid());
select t_ok((select items -> 0 ->> 'note' from o20) = 'без сахара, диабет', 'пожелание к блюду сохраняется (лишние пробелы и переносы убраны)');
select t_ok((select jsonb_array_length(items) from o20) = 2 and not ((select items -> 1 from o20) ? 'note'), 'то же блюдо без пожелания — отдельная строка');
select t_ok(exists (select 1 from net.sent where body ->> 'text' like '%Зелёный чай%>> без сахара, диабет%'), 'пожелание к блюду видно в Telegram');
set role anon;
select t_fails($$select * from public.place_order((select token from tv where label = 'VIP'), '[{"id":"green-tea","qty":1,"price":10,"note":"без сахара"},{"id":"green-tea","qty":1,"price":10,"note":" без  сахара "}]', null, 'ru', gen_random_uuid())$$, 'bad_items', 'одинаковое пожелание к одному блюду дважды — нельзя');
reset role;
select t_ok(char_length(public.order_line(jsonb_build_object('id', 'green-tea', 'qty', 1, 'price', 10, 'note', repeat('а', 500)), true) ->> 'note') = 120, 'длинное пожелание обрезается до 120 символов');
-- ============ 21. Коротко: пришёл заказ → «Подано» ============
grant select on o20 to authenticated;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '777000222' and body ->> 'text' like 'На кухню: заказ №' || (select no from o20) || '%'), 'гостевой заказ сразу ушёл повару, без «принять»');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select status from public.serve_order((select id from o20))) = 'served', 'официант подаёт новый заказ сразу');
select t_ok((select served_by_name = 'Азиз' and served_at is not null from public.orders where id = (select id from o20)), 'у поданного заказа записано, кто и когда подал');
reset role; reset request.jwt.claim.sub;
-- ============ 22. Аудит: оплата, правка с пожеланиями, «вернуть» ============
create temp table o22 as select * from public.place_order((select token from tv where label = '1'),
  '[{"id":"green-tea","qty":1,"price":10,"note":"без сахара"},{"id":"green-tea","qty":1,"price":10}]', null, 'ru', gen_random_uuid());
grant select on o22 to authenticated;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(jsonb_array_length((select items from public.edit_order((select id from o22), '[{"id":"green-tea","qty":2,"note":"без сахара"},{"id":"green-tea","qty":1}]'))) = 2, 'владелец правит заказ, где одно блюдо с пожеланием и без');
select t_ok((select items -> 0 ->> 'note' from public.orders where id = (select id from o22)) = 'без сахара' and (select (items -> 0 ->> 'qty')::int from public.orders where id = (select id from o22)) = 2, 'пожелание при правке сохранилось');
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'chat_id' = '777000222' and body ->> 'text' like 'Изменён заказ №' || (select no from o22) || '%'), 'повару ушло «заказ изменён»');
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.serve_order((select id from o22));
select t_ok(public.t_rows($$update public.orders set status = 'new' where id = (select id from o22)$$) = 1, 'владелец вернул заказ в «ждёт подачи»');
select t_ok((select served_at is null and served_by_name is null from public.orders where id = (select id from o22)), 'вернули в «ждёт подачи» — отметка «подано» стёрлась');
create temp table b22 as select * from public.close_bill((select id from tv where label = '1'), 'cash', array[(select id from o22)]);
select t_ok((select status = 'served' and paid_at is not null and served_by_name is not null from public.orders where id = (select id from o22)), 'оплаченный заказ сам становится «подан», даже если забыли нажать');
select t_fails($$update public.orders set status = 'cancelled' where id = (select id from o22)$$, 'paid', 'оплаченный заказ отменить нельзя');
reset role; reset request.jwt.claim.sub;
-- ============ 23. Скидка на счёт и округление наличных до 5 сен ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table o23 as select * from public.staff_place_order((select id from tv where label = '3'), '[{"id":"green-tea","qty":3}]', null, gen_random_uuid());
select t_ok((select total from o23) = 34.98, 'заказ 30 + сбор 10% + налог 6% = 34,98');
select t_fails($$select * from public.close_bill((select id from tv where label = '3'), 'cash', array[(select id from o23)], 0, null, '{"kind":"pct","value":10,"reason":"Постоянный гость"}')$$, 'no_discount_rights', 'официант без разрешения скидку не даёт');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_fails($$select * from public.close_bill((select id from tv where label = '3'), 'cash', array[(select id from o23)], 0, null, '{"kind":"pct","value":10,"reason":"  "}')$$, 'discount_reason', 'скидка без причины не проходит');
select t_fails($$select * from public.close_bill((select id from tv where label = '3'), 'cash', array[(select id from o23)], 0, null, '{"kind":"amount","value":31,"reason":"Жалоба"}')$$, 'bad_discount', 'скидка больше суммы блюд не проходит');
create temp table b23 as select * from public.close_bill((select id from tv where label = '3'), 'cash', array[(select id from o23)], 0, null, '{"kind":"pct","value":10,"reason":"Постоянный гость"}');
select t_ok((select discount = 3 and service = 2.70 and tax = 1.78 and total = 31.48 from b23), 'скидка 10%: блюда −3,00, сбор и налог пересчитаны, итого 31,48');
select t_ok((select rounding = 0.02 and (payments -> 0 ->> 'amount')::numeric = 31.50 from b23), 'наличными 31,48 → 31,50 (округление +0,02)');
select t_ok((select discount_reason = 'Постоянный гость' and discount_by_name = 'Хозяин' and discount_pct = 10 from b23), 'в счёте записано: сколько, почему и кто дал скидку');
create temp table o23b as select * from public.staff_place_order((select id from tv where label = '3'), '[{"id":"green-tea","qty":3}]', null, gen_random_uuid());
select t_fails($$select * from public.close_bill((select id from tv where label = '3'), 'mixed', array[(select id from o23b)], 0, '[{"method":"card","amount":20},{"method":"cash","amount":14.98}]')$$, 'bad_payments', 'наличная часть без округления не проходит');
create temp table b23b as select * from public.close_bill((select id from tv where label = '3'), 'mixed', array[(select id from o23b)], 0, '[{"method":"card","amount":20},{"method":"cash","amount":15}]');
select t_ok((select rounding = 0.02 and total = 34.98 from b23b), 'карта 20 + наличные 14,98 → 15,00: округляется только наличная часть');
reset role; reset request.jwt.claim.sub;
-- ============ 24. Пересадить гостей / объединить столы ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table o24 as select * from public.staff_place_order((select id from tv where label = '2'), '[{"id":"green-tea","qty":1}]', null, gen_random_uuid());
select t_ok(public.move_orders((select id from tv where label = '2'), (select id from tv where label = '1'), array[(select id from o24)]) = 1, 'официант пересаживает заказ на другой стол');
select t_ok((select table_id = (select id from tv where label = '1') and table_label = '1' from public.orders where id = (select id from o24)), 'заказ теперь у стола 1');
select t_fails($$select public.move_orders((select id from tv where label = '1'), (select id from tv where label = '1'))$$, 'same_table', 'на тот же стол пересадить нельзя');
select t_fails($$select public.move_orders((select id from tv where label = '1'), (select id from tv where label = '4'))$$, 'not_found', 'на выключенный стол пересадить нельзя');
select t_fails($$select public.move_orders((select id from tv where label = '1'), (select id from tv where label = '2'), array[(select id from o22)])$$, 'nothing_to_move', 'оплаченный заказ не пересаживается');
select public.claim_table((select id from tv where label = '1'), true);
reset role; reset request.jwt.claim.sub;
delete from public.table_waiters where table_id = (select id from tv where label = 'VIP');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(public.move_orders((select id from tv where label = '1'), (select id from tv where label = 'VIP')) >= 1, 'объединение: все заказы стола 1 переходят к VIP');
reset role; reset request.jwt.claim.sub;
select t_ok(not exists (select 1 from public.orders where table_id = (select id from tv where label = '1') and paid_at is null and status <> 'cancelled'), 'на старом столе ничего не осталось');
select t_ok(not exists (select 1 from public.table_waiters where table_id = (select id from tv where label = '1'))
        and (select user_id from public.table_waiters where table_id = (select id from tv where label = 'VIP')) = '22222222-2222-2222-2222-222222222222', 'официант перешёл к новому столу, старый стол свободен');
set role anon;
select t_fails($$select public.move_orders((select id from tv where label = 'VIP'), (select id from tv where label = '2'))$$, 'permission denied', 'гость не пересаживает заказы');
reset role;
-- ============ 25. Отмена оплаты ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
create temp table b25 as select * from public.close_bill((select id from tv where label = 'VIP'), 'card', array[(select id from o24)]);
reset role; reset request.jwt.claim.sub;
grant select on b25, o24 to authenticated;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select * from public.void_bill((select id from b25), 'ошибка')$$, 'forbidden', 'официант оплату не отменяет');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_fails($$select * from public.void_bill((select id from b25), '  ')$$, 'void_reason', 'без причины оплату не отменить');
select t_ok((select voided_by_name = 'Хозяин' and void_reason = 'Ошиблись способом оплаты' from public.void_bill((select id from b25), ' Ошиблись   способом оплаты ')), 'владелец отменяет оплату с причиной');
select t_ok((select paid_at is null and bill_id is null and status = 'served' from public.orders where id = (select id from o24)), 'заказ снова ждёт оплаты, «подано» осталось');
select t_ok((select voided_at is not null and total = (select total from b25) from public.bills where id = (select id from b25)), 'счёт не удалён, а помечен «отменён»');
select t_fails($$select * from public.void_bill((select id from b25), 'ещё раз')$$, 'already_voided', 'дважды отменить нельзя');
create temp table b25b as select * from public.close_bill((select id from tv where label = 'VIP'), 'cash', array[(select id from o24)]);
select t_ok((select order_ids = array[(select id from o24)] from b25b), 'после отмены заказ оплачивается заново, правильным способом');
select t_fails($$update public.bills set total = 0 where id = (select id from b25)$$, 'permission denied', 'счёт руками не поправить');
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'text' like 'Отменена оплата счёта №' || (select no from b25) || '%причина: Ошиблись способом оплаты'), 'владельцу в Telegram ушло «отменена оплата»');
select t_ok(exists (select 1 from public.audit_log where entity = 'bill' and action = 'update' and entity_id = (select id::text from b25)), 'отмена оплаты записана в журнал');
-- ============ 26. Закрытие дня (Z-отчёт) ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select public.z_preview()$$, 'forbidden', 'официант не видит Z-отчёт');
select t_fails($$select * from public.close_day(0)$$, 'forbidden', 'официант не закрывает день');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
create temp table z0 as select public.z_preview() as z;
select t_ok((select (z ->> 'voided')::int >= 1 and (z ->> 'bills')::int >= 3 from z0), 'в отчёте дня видны счета и отменённые оплаты');
select t_ok((select (z ->> 'total')::numeric = (select sum(total) from public.bills where voided_at is null) from z0), 'выручка дня = все счета без отменённых');
select t_ok((select (z ->> 'cash')::numeric = (select coalesce(sum((p ->> 'amount')::numeric), 0) from public.bills, jsonb_array_elements(payments) p where voided_at is null and p ->> 'method' = 'cash') from z0), 'наличные в кассе = все наличные части оплат');
select t_fails($$select * from public.close_day(-5)$$, 'bad_amount', 'отрицательную сумму в кассе не ввести');
create temp table z1 as select * from public.close_day(123.45, 'Смена Азиза');
select t_ok((select no = 1 and counted_cash = 123.45 and closed_by_name = 'Хозяин' and (totals ->> 'bills') = (select z ->> 'bills' from z0) from z1), 'день закрыт: Z-отчёт №1 с итогами и суммой в кассе');
select t_ok((select (z ->> 'bills')::int = 0 and (z ->> 'total')::numeric = 0 from (select public.z_preview() as z) x), 'после закрытия новый день начинается с нуля');
select t_fails($$select * from public.void_bill((select id from b25b), 'поздно')$$, 'day_closed', 'оплату из закрытого дня отменить нельзя');
create temp table z2 as select * from public.close_day();
select t_ok((select no = 2 and opened_at = (select closed_at from z1) and counted_cash is null from z2), 'следующий Z-отчёт начинается ровно там, где закончился прошлый');
reset role; reset request.jwt.claim.sub;
select t_ok(exists (select 1 from net.sent where body ->> 'text' like 'Закрыт день, Z-отчёт №1:%'), 'владельцу в Telegram ушли итоги дня');
set role anon;
select t_fails($$select * from public.z_reports$$, 'permission denied', 'гость не видит Z-отчёты');
reset role;
-- ============ 27. Wi‑Fi, чек гостя, отзыв в Google ============
set role anon;
select t_fails($$select * from public.wifi$$, 'permission denied', 'гость не читает Wi‑Fi напрямую');
select t_ok((select wifi_name is null and wifi_pass is null from public.table_info((select token from tv where label = 'VIP'))), 'пока Wi‑Fi не задан — гостю пусто');
reset role;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok(public.t_rows($$update public.wifi set pass = 'hack'$$) = 0, 'официант не меняет Wi‑Fi');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.t_rows($$update public.wifi set name = 'CentralAsia_Guest', pass = 'plov2026'$$) = 1, 'владелец задаёт Wi‑Fi');
select t_ok(public.t_rows($$update public.settings set google_review_url = 'https://g.page/r/test/review'$$) = 1, 'владелец ставит ссылку на отзыв в Google');
select t_fails($$update public.settings set google_review_url = 'javascript:alert(1)'$$, 'check constraint', 'ссылка на отзыв — только https');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select wifi_name = 'CentralAsia_Guest' and wifi_pass = 'plov2026' from public.table_info((select token from tv where label = 'VIP'))), 'гость за столом видит Wi‑Fi');
select t_ok(not exists (select 1 from public.table_info('0000000000000000000a')), 'без настоящего QR Wi‑Fi не показать');
select t_ok((select google_review_url from public.settings) = 'https://g.page/r/test/review', 'гость видит ссылку на отзыв');
reset role;
create temp table o27 as select * from public.place_order((select token from tv where label = '2'), '[{"id":"green-tea","qty":2,"price":10}]', null, 'ru', gen_random_uuid());
grant select on o27 to anon, authenticated;
set role anon;
select t_ok(public.guest_receipt((select id from o27), (select guest_token from o27)) is null, 'пока счёт не закрыт — чека нет');
reset role;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table b27 as select * from public.close_bill((select id from tv where label = '2'), 'cash', array[(select id from o27)]);
reset role; reset request.jwt.claim.sub;
grant select on b27 to anon, authenticated;
set role anon;
select t_ok((select (r ->> 'no')::bigint = (select no from b27) and (r ->> 'total')::numeric = (select total from b27) and jsonb_array_length(r -> 'items') = 1 and r -> 'waiters' ? 'Азиз'
  from (select public.guest_receipt((select id from o27), (select guest_token from o27)) as r) x), 'гость открывает чек своего заказа: номер, сумма, блюда, официант');
select t_ok(public.guest_receipt((select id from o27), gen_random_uuid()) is null, 'чужой чек без секрета заказа не открыть');
reset role;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.void_bill((select id from b27), 'проверка');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok(public.guest_receipt((select id from o27), (select guest_token from o27)) is null, 'после отмены оплаты чек у гостя пропадает');
reset role;
-- ============ 28. Менеджер, язык чека, резервная копия ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.invite_staff('Manager@Example.com', 'manager', 'Дилшод') = 'invited', 'владелец приглашает менеджера');
reset role; reset request.jwt.claim.sub;
insert into auth.users (id, email, email_confirmed_at) values ('66666666-6666-6666-6666-666666666666', 'manager@example.com', now());
select t_ok((select role from public.staff where user_id = '66666666-6666-6666-6666-666666666666') = 'manager', 'приглашённый менеджер получил роль');
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
create temp table o28 as select * from public.staff_place_order((select id from tv where label = '1'), '[{"id":"green-tea","qty":2}]', null, gen_random_uuid());
select t_ok(public.is_floor() and public.is_manager() and not public.is_owner(), 'менеджер работает в зале, но не владелец');
select t_ok(jsonb_array_length((select items from public.edit_order((select id from o28), '[{"id":"green-tea","qty":3}]'))) = 1, 'менеджер правит заказ');
create temp table b28 as select * from public.close_bill((select id from tv where label = '1'), 'card', array[(select id from o28)], 0, null, '{"kind":"pct","value":10,"reason":"Жалоба гостя"}');
select t_ok((select discount > 0 and discount_by_name = 'Дилшод' from b28), 'менеджер даёт скидку без отдельного разрешения');
select t_ok((select voided_by_name = 'Дилшод' from public.void_bill((select id from b28), 'Ошиблись картой')), 'менеджер отменяет оплату');
select t_ok((public.z_preview() ->> 'voided')::int >= 1, 'менеджер видит Z-отчёт');
select t_ok(public.t_rows($$update public.orders set status = 'cancelled' where id = (select id from o28)$$) = 1, 'менеджер отменяет заказ');
select t_ok(public.t_rows($$update public.dishes set price = 1 where id = 'green-tea'$$) = 0, 'менеджер не меняет цены в меню');
select t_ok(public.t_rows($$update public.settings set service_pct = 0$$) = 0, 'менеджер не меняет настройки ресторана');
select t_ok((select count(*) from public.audit_log) = 0, 'менеджер не видит журнал изменений');
select t_ok((select count(*) from public.wifi) = 0, 'менеджер не видит пароль Wi‑Fi в настройках');
select t_ok((select count(*) from public.staff) = 1, 'менеджер видит только себя в списке сотрудников');
select t_fails($$select public.invite_staff('x@example.com', 'owner')$$, 'forbidden', 'менеджер не приглашает сотрудников');
select t_fails($$select public.mark_backup()$$, 'forbidden', 'менеджер не скачивает резервную копию');
create temp table z28 as select * from public.close_day(0);
select t_ok((select closed_by_name = 'Дилшод' from z28), 'менеджер закрывает день');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select public.z_preview()$$, 'forbidden', 'официант по-прежнему не видит Z-отчёт');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.t_rows($$update public.settings set receipt_lang = 'ms'$$) = 1, 'владелец выбирает язык чека');
select t_fails($$update public.settings set receipt_lang = 'xx'$$, 'check constraint', 'неизвестный язык чека не сохранить');
select public.mark_backup();
select t_ok((select backup_at is not null from public.settings), 'владелец отмечает скачанную копию');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_fails($$select public.mark_backup()$$, 'permission denied', 'гость не трогает отметку копии');
reset role;
-- ============ 29. Акция, блюдо дня ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.t_rows($$update public.dishes set promo_price = 7, featured = true where id = 'samsa-meat'$$) = 1, 'владелец ставит акцию и блюдо дня');
select t_fails($$update public.dishes set promo_price = 9 where id = 'samsa-meat'$$, 'check', 'акционная цена должна быть ниже обычной');
select t_fails($$update public.dishes set promo_from = '15:00' where id = 'samsa-meat'$$, 'check', 'часы акции — оба или ни одного');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select promo_price = 7 and featured from public.dishes where id = 'samsa-meat'), 'гость видит акцию');
reset role;
select t_ok((public.order_line('{"id":"samsa-meat","qty":1,"price":7}', true) ->> 'price')::numeric = 7, 'заказ по акции идёт по акционной цене');
select t_fails($$select public.order_line('{"id":"samsa-meat","qty":1,"price":9}', true)$$, 'price_changed', 'старая цена во время акции — «цена изменилась»');
-- акция только в часы, которые уже прошли сегодня → сейчас обычная цена
update public.dishes set promo_from = to_char((now() at time zone 'Asia/Kuala_Lumpur') - interval '3 hours', 'HH24:MI'),
                         promo_to = to_char((now() at time zone 'Asia/Kuala_Lumpur') - interval '2 hours', 'HH24:MI') where id = 'samsa-meat';
select t_ok((public.order_line('{"id":"samsa-meat","qty":1,"price":9}', true) ->> 'price')::numeric = 9, 'вне часов акции — обычная цена');
update public.dishes set promo_price = null, promo_from = null, promo_to = null, featured = false where id = 'samsa-meat';
-- ============ 30. Стоп-лист и остатки ============
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_ok((select not available from public.set_dish_available('samsa-meat', false)), 'повар ставит блюдо в «закончилось»');
select t_ok((select available from public.set_dish_available('samsa-meat', true)), 'повар возвращает блюдо');
select t_ok((select stock = 3 from public.set_dish_stock('samsa-meat', 3)), 'повар пишет остаток: 3 порции');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select public.set_dish_available('samsa-meat', false)$$, 'forbidden', 'официант не трогает стоп-лист');
create temp table o30 as select * from public.staff_place_order((select id from tv where label = '1'), '[{"id":"samsa-meat","qty":2}]', null, gen_random_uuid());
reset role; reset request.jwt.claim.sub;
select t_ok((select stock from public.dishes where id = 'samsa-meat') = 1, 'заказ списал 2 порции');
select t_ok(not exists (select 1 from public.audit_log where entity = 'dish' and changes ? 'stock' and who = 'Азиз'), 'автосписание не засоряет журнал');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_fails($$select * from public.staff_place_order((select id from tv where label = '1'), '[{"id":"samsa-meat","qty":2}]', null, gen_random_uuid())$$, 'sold_out:samsa-meat', 'больше, чем осталось, не заказать');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select t_ok(jsonb_array_length((select items from public.edit_order((select id from o30), '[{"id":"samsa-meat","qty":3}]'))) = 1, 'менеджер увеличил заказ на последнюю порцию');
reset role; reset request.jwt.claim.sub;
select t_ok((select stock from public.dishes where id = 'samsa-meat') = 0, 'правка заказа списала разницу');
select t_fails($$select public.order_line('{"id":"samsa-meat","qty":1,"price":9}', true)$$, 'unavailable', 'остаток 0 — заказать нельзя');
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select t_ok(public.t_rows($$update public.orders set status = 'cancelled' where id = (select id from o30)$$) = 1, 'менеджер отменил заказ');
reset role; reset request.jwt.claim.sub;
select t_ok((select stock from public.dishes where id = 'samsa-meat') = 3, 'отмена вернула порции');
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select t_ok((select stock is null from public.set_dish_stock('samsa-meat', null)), 'менеджер убирает счёт порций');
reset role; reset request.jwt.claim.sub;
-- ============ 31. Себестоимость ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.dish_costs (dish_id, cost) values ('samsa-meat', 3.5);
select t_ok((select cost from public.dish_costs where dish_id = 'samsa-meat') = 3.5, 'владелец вписал себестоимость');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select t_ok((select count(*) from public.dish_costs) = 0, 'менеджер не видит себестоимость');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_fails($$select * from public.dish_costs$$, 'permission denied', 'гость не видит себестоимость');
reset role;
-- ============ 32. Оценки блюд ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table o32 as select * from public.staff_place_order((select id from tv where label = '1'), '[{"id":"samsa-meat","qty":1},{"id":"green-tea","qty":1}]', null, gen_random_uuid());
reset role; reset request.jwt.claim.sub;
update public.orders set status = 'new' where id = (select id from o32);
grant select on o32 to anon, authenticated;
set role anon;
select t_fails($$select public.vote_dishes((select id from o32), (select guest_token from o32), '{"samsa-meat":1}')$$, 'too_early', 'пока заказ не подали — оценить нельзя');
reset role;
update public.orders set status = 'served' where id = (select id from o32);
set role anon;
select t_ok(public.vote_dishes((select id from o32), (select guest_token from o32), '{"samsa-meat":1,"green-tea":-1}') = 2, 'гость оценил два блюда');
select t_fails($$select public.vote_dishes((select id from o32), (select guest_token from o32), '{"plov-tashkent":1}')$$, 'bad_request', 'оценить блюдо не из своего заказа нельзя');
select t_fails($$select public.vote_dishes((select id from o32), gen_random_uuid(), '{"samsa-meat":-1}')$$, 'not_found', 'без секрета заказа не оценить');
select public.vote_dishes((select id from o32), (select guest_token from o32), '{"green-tea":0}');
reset role;
select t_ok((select count(*) from public.dish_votes where order_id = (select id from o32)) = 1, '0 убирает оценку');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select count(*) from public.dish_votes) = 0, 'официант не видит оценки блюд');
reset role; reset request.jwt.claim.sub;
-- ============ 33. Бронь ============
update public.settings set schedule = '[{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"},{"closed":false,"open":"00:00","close":"23:59"}]';
set role anon;
create temp table r33 as select * from public.book_table('Алишер', '+60 12-345 6789', date_trunc('hour', now()) + interval '1 day 2 hours', 4, 'У окна', 'ru', gen_random_uuid());
select t_ok((select status = 'new' and people = 4 from r33), 'гость оставил бронь');
select t_fails($$select * from public.book_table('А', '+60123456789', now() + interval '5 minutes', 2, null, 'ru', gen_random_uuid())$$, 'bad_time', 'бронь на «через 5 минут» не принимается');
select t_fails($$select * from public.book_table('А', 'abc', now() + interval '1 day', 2, null, 'ru', gen_random_uuid())$$, 'bad_request', 'неверный телефон');
select t_fails($$select * from public.reservations$$, 'permission denied', 'гость не видит чужие брони');
select t_ok((select status from public.my_booking((select id from r33), (select guest_token from r33))) = 'new', 'гость видит свою бронь');
select t_ok((select count(*) from public.my_booking((select id from r33), gen_random_uuid())) = 0, 'без секрета бронь не видна');
reset role;
grant select on r33 to anon, authenticated;
select t_ok((select count(*) from public.book_table('Алишер', '+60 12-345 6789', now() + interval '1 day', 4, null, 'ru', (select client_key from public.reservations where id = (select id from r33)))) = 1
  and (select count(*) from public.reservations) = 1, 'повтор с тем же ключом не создаёт вторую бронь');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select t_ok((select status = 'confirmed' and table_label = '2' and decided_by_name = 'Азиз' from public.set_booking((select id from r33), 'confirmed', (select id from tv where label = '2'))), 'официант подтвердил бронь и выбрал стол');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_fails($$select public.set_booking((select id from r33), 'cancelled')$$, 'forbidden', 'повар не трогает брони');
reset role; reset request.jwt.claim.sub;
set role anon;
select t_ok((select table_label from public.my_booking((select id from r33), (select guest_token from r33))) = '2', 'гость видит, что бронь подтверждена на стол 2');
select t_ok(public.cancel_booking((select id from r33), (select guest_token from r33)) = 'cancelled', 'гость сам отменил бронь');
reset role;
update public.settings set bookings_enabled = false;
set role anon;
select t_fails($$select * from public.book_table('А', '+60123456789', now() + interval '1 day', 2, null, 'ru', gen_random_uuid())$$, 'bookings_off', 'бронь выключена — не принимается');
reset role;
update public.settings set bookings_enabled = true;
-- ============ 34. Смены ============
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
create temp table s34 as select * from public.shift_start();
select t_ok((select count(*) from public.shift_start()) = 1 and (select count(*) from public.shifts where ended_at is null) = 1, 'повторное «Пришёл» не открывает вторую смену');
select t_ok((select ended_at is not null from public.shift_end()), 'официант ушёл со смены');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select t_ok((select count(*) from public.shifts) = 0, 'повар не видит чужие смены');
reset role; reset request.jwt.claim.sub;
set role authenticated; set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select t_ok((select count(*) from public.shifts where name = 'Азиз') = 1, 'менеджер видит смены сотрудников');
reset role; reset request.jwt.claim.sub;
-- ============ 35. Цель дня и бар ============
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select t_ok(public.t_rows($$update public.settings set day_goal = 1000$$) = 1, 'владелец ставит цель дня');
select t_ok(public.t_rows($$update public.categories set station = 'bar' where id = 'drinks'$$) <= 1, 'категорию можно отдать бару');
select t_fails($$update public.categories set station = 'grill'$$, 'check', 'неизвестный цех не сохранить');
reset role; reset request.jwt.claim.sub;
\echo ALL DATABASE TESTS PASSED
