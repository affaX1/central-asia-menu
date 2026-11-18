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
\echo ALL DATABASE TESTS PASSED
