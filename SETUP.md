# Как включить приём заказов (Supabase)

Один раз, минут 10. После этого гости отправляют заказ с телефона,
а вы видите его в админке со звуком.

Пока это не сделано, меню работает как раньше: гость собирает список и показывает официанту.

## 1. Создать проект

1. Зайти на **supabase.com** → Start your project → войти (можно через GitHub).
2. **New project**:
   - Name: `central-asia-menu`
   - Database Password: придумать и **сохранить у себя** (мне не присылать)
   - Region: **Southeast Asia (Singapore)** — ближе всего к Малайзии
3. Нажать **Create new project** и подождать 1–2 минуты.

## 2. Создать таблицы

1. Слева **SQL Editor** → **New query**.
2. Открыть файл `supabase/schema.sql`, скопировать **всё** и вставить.
3. Нажать **Run**. Должно быть `Success. No rows returned`.

## 3. Закрыть свободную регистрацию

**Authentication → Sign In / Providers** → выключить **Allow new users to sign up** → Save.
Так никто посторонний не сможет создать себе аккаунт.

## 4. Добавить сотрудника

1. **Authentication → Users → Add user → Create new user**.
2. Email и пароль сотрудника, поставить галочку **Auto Confirm User** → Create.
3. **SQL Editor → New query**, вставить (email поменять на свой) и **Run**:

```sql
insert into public.staff (user_id, name)
select id, 'Администратор' from auth.users where email = 'admin@example.com'
on conflict do nothing;
```

Для каждого нового сотрудника повторить шаг 4.
Убрать сотрудника: `delete from public.staff where user_id = (select id from auth.users where email = '...');`

## 5. Прислать мне две строчки

Кнопка **Connect** вверху (или **Project Settings → API Keys**):

- **Project URL** — вида `https://abcdefgh.supabase.co`
- **Publishable key** (`sb_publishable_...`) или **anon public** key

Эти две строчки публичные, их можно присылать. Я впишу их в `config.js` и выложу.

**Не присылать никому:** пароль базы, `service_role` / `secret` ключ.

## 6. Готово

- Гости: QR-код на столе → меню → «Отправить заказ».
- Сотрудники: **https://affax1.github.io/central-asia-menu/admin.html** → войти email + пароль.
  Держать открытой на планшете или телефоне на кассе/кухне.
  Первый раз нажать жёлтую полоску «включить звук» — браузер без нажатия звук не даёт.
