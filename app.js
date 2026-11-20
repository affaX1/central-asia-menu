(() => {
  'use strict';

  // =====================================================================
  //  Меню для гостя. Гость смотрит меню и собирает свой список блюд,
  //  чтобы показать его официанту. Список никуда не отправляется.
  // =====================================================================

  // ---------- Тексты интерфейса на 5 языках ----------
  const T = {
    ru: {
      langName: 'Русский', locale: 'ru-RU', dir: 'ltr',
      menuWord: 'Меню',
      search: 'Поиск по меню', clearSearch: 'Очистить поиск',
      order: 'Мой заказ', total: 'Итого', clear: 'Очистить список',
      nothing: 'Ничего не нашлось', nothingHint: 'Попробуйте другое слово или посмотрите всё меню.', showAll: 'Показать всё меню',
      add: 'Добавить', remove: 'Убрать одну', removeItem: 'Убрать',
      waiter: 'Покажите этот список официанту — он примет заказ.',
      orderEmpty: 'Список пока пуст. Добавляйте блюда кнопкой «плюс».',
      g: 'г', ml: 'мл', kcal: 'ккал', pcs: () => 'шт.',
      table: 'Стол',
      ingredients: 'Состав', allergens: 'Аллергены',
      close: 'Закрыть', themeDark: 'Тёмная тема', themeLight: 'Светлая тема', language: 'Язык',
      tags: { hit: 'Хит', new: 'Новинка', spicy: 'Острое', veg: 'Без мяса' },
      allergenNames: { gluten: 'глютен', milk: 'молоко', eggs: 'яйца', fish: 'рыба', shellfish: 'морепродукты', nuts: 'орехи', soy: 'соя', sesame: 'кунжут' },
      soldOut: 'Нет в наличии', soldOutRow: 'Сейчас нет в наличии — не входит в сумму',
      unavailableNotice: (n) => `Сейчас нет в наличии: ${n}. Эти позиции не входят в сумму — уберите их или спросите официанта.`,
      priceNotice: (n) => `Изменилась цена: ${n}. Сумма пересчитана.`,
      listUpdated: 'Меню обновилось — проверьте свой список.',
      open: 'Открыто', closed: 'Закрыто', until: (x) => `до ${x}`,
      opensToday: (x) => `откроется в ${x}`, opensTomorrow: (x) => `откроется завтра в ${x}`,
      opensOn: (d, x) => `откроется ${['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'][d]} в ${x}`,
      closedForNow: 'Временно не работает',
      hours: 'Часы работы', daily: 'Ежедневно', dayOff: 'выходной', today: 'Сегодня',
      tzNote: (tz) => `Время указано по часам ресторана (${tz}).`,
      days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
      openMap: 'Открыть на карте', call: 'Позвонить',
      loading: 'Загружаем меню…', loadError: 'Не удалось загрузить меню', loadErrorHint: 'Проверьте интернет и попробуйте ещё раз.', retry: 'Повторить',
      emptyMenu: 'Меню скоро появится', emptyMenuHint: 'Ресторан ещё заполняет меню. Спросите официанта.',
      offline: 'Нет связи — показано меню, загруженное ранее.',
      sendOrder: 'Отправить заказ', sending: 'Отправляем…',
      noteLabel: "Комментарий к заказу", notePh: 'Например: у меня диабет, аллергия на орехи, всё без лука',
      noteHint: "Напишите своими словами — официант и повар увидят это сразу.", dishNote: "Пожелание к блюду", dishNotePh: "Например: без лука, поменьше соли", noteDone: "Готово",
      yourTable: 'Ваш стол',
      noTable: 'Чтобы отправить заказ, отсканируйте QR-код на своём столе.',
      badTable: 'Этот QR-код недействителен или стол отключён. Попросите официанта помочь.',
      checkingTable: 'Проверяем стол…',
      noServer: 'Онлайн-заказы пока не подключены. Покажите этот список официанту.',
      ordersOff: 'Сейчас заказы через меню не принимаются. Пожалуйста, позовите официанта.',
      closedNoOrders: 'Ресторан сейчас закрыт — заказы не принимаются.',
      removeSold: 'Уберите из заказа блюда, которых нет в наличии, — тогда заказ можно отправить.',
      errNetwork: 'Нет связи — заказ не отправлен. Проверьте интернет и нажмите «Отправить заказ» ещё раз.',
      errServer: 'Сервер не ответил — заказ не отправлен. Попробуйте ещё раз.',
      errTooMany: 'Слишком много заказов подряд с этого стола. Подождите несколько минут или позовите официанта.',
      errChanged: 'Меню изменилось. Проверьте заказ — и отправьте ещё раз.',
      sentTitle: (n) => `Заказ №${n} отправлен`,
      orderNo: (n) => `Заказ №${n}`,
      sentAt: (x) => `Отправлен в ${x}`,
      statuses: { new: 'Отправлен', accepted: 'Принят официантом', cooking: 'Готовится', ready: 'Готово — несут', served: 'Подано', cancelled: 'Отменён' },
      meatNames: { beef: 'Говядина', lamb: 'Баранина', horse: 'Конина', chicken: 'Курица', fish: 'Рыба', seafood: 'Морепродукты' }, halal: 'Халяль', meatLabel: 'Мясо',
      statusHint: { new: 'Заказ получен — официант и кухня его уже видят.', accepted: 'Официант принял ваш заказ.', cooking: 'Повар уже готовит ваш заказ.', ready: 'Заказ готов — официант сейчас принесёт.', served: 'Приятного аппетита!', cancelled: 'Заказ отменён. Пожалуйста, обратитесь к официанту.' },
      statusStale: 'Не удалось обновить статус — проверим ещё раз через несколько секунд.',
      myOrders: 'Мои заказы', orderMore: 'Заказать ещё', note: 'Комментарий',
      servedAt: (a, b) => `Подаётся ${a}–${b}`, fromTime: (a) => `с ${a}`, notNowRow: (a, b) => `Подаётся с ${a} до ${b}`, nowServing: 'Сейчас',
      readyToast: 'Ваш заказ готов — официант уже несёт!', stepAccepted: 'Принят', stepCooking: 'Готовится', stepReady: 'Готово',
      tableBill: 'Счёт стола', tableBillHint: 'Все неоплаченные заказы вашего стола — ваши и друзей.', tableBillEmpty: 'Неоплаченных заказов за столом нет.', tableTotal: 'Всего за стол',
      reqTitle: 'Что нужно?', reqCome: 'Просто подойти', reqs: { water: 'Вода', napkins: 'Салфетки', cutlery: 'Приборы', ice: 'Лёд', clear: 'Убрать со стола' }, reqPending: 'уже попросили',
      filter: 'Фильтры', fVeg: 'Без мяса', fSpicy: 'Острое', fNo: 'Без', fReset: 'Сбросить', fShow: (n) => `Показать (${n})`, fNote: 'Состав и аллергены — по данным ресторана. Если у вас аллергия, уточните у официанта.',
      hits: 'Хиты', pairs: 'С этим берут', upsell: 'Добавить к заказу?',
      rateTitle: 'Как вам у нас?', ratePh: 'Что понравилось или что улучшить?', rateSend: 'Отправить отзыв', rateThanks: 'Спасибо за отзыв!', rateStar: (n) => `${n} из 5`,
      repeat: 'Повторить заказ', repeatDone: (n) => `Добавлено в список: ${n}`, repeatSome: 'Некоторых блюд сейчас нет — их не добавили.',
      prep: (n) => `≈ ${n} мин`, photoOf: (a, b) => `${a} из ${b}`,
      callWaiter: 'Позвать официанта', askBill: 'Попросить счёт', waiterComing: 'Официант уже идёт', billComing: 'Счёт уже несут',
      callSent: 'Официант получил сигнал и скоро подойдёт.', billSent: 'Официант принесёт счёт.', callErr: 'Не получилось отправить сигнал. Позовите официанта рукой или попробуйте ещё раз.',
      payHow: 'Как будете платить?', payCash: 'Наличными', payCard: 'Картой', payQr: 'По QR-коду',
      subtotal: 'Блюда', service: (p) => `Сервисный сбор${p ? ` ${p}%` : ''}`, paid: 'Оплачено',
      required: 'обязательно', optional: 'по желанию', addFor: (s) => `Добавить · ${s}`, chooseOptions: 'Выбрать вариант',
      edited: (x) => `Ресторан изменил заказ в ${x}`,
    },
    uz: {
      langName: "O'zbekcha", locale: 'uz-Latn-UZ', dir: 'ltr',
      menuWord: 'Menyu',
      search: "Menyu bo'yicha qidirish", clearSearch: 'Qidiruvni tozalash',
      order: 'Mening buyurtmam', total: 'Jami', clear: "Ro'yxatni tozalash",
      nothing: 'Hech narsa topilmadi', nothingHint: "Boshqa so'z bilan qidiring yoki butun menyuni ko'ring.", showAll: "Butun menyuni ko'rsatish",
      add: "Qo'shish", remove: 'Bittasini olib tashlash', removeItem: 'Olib tashlash',
      waiter: "Ushbu ro'yxatni ofitsiantga ko'rsating — u buyurtmani qabul qiladi.",
      orderEmpty: "Ro'yxat hozircha bo'sh. Taomlarni «plyus» tugmasi bilan qo'shing.",
      g: 'g', ml: 'ml', kcal: 'kkal', pcs: () => 'dona',
      table: 'Stol',
      ingredients: 'Tarkibi', allergens: 'Allergenlar',
      close: 'Yopish', themeDark: "Qorong'i mavzu", themeLight: "Yorug' mavzu", language: 'Til',
      tags: { hit: 'Xit', new: 'Yangi', spicy: 'Achchiq', veg: "Go'shtsiz" },
      allergenNames: { gluten: 'kleykovina', milk: 'sut', eggs: 'tuxum', fish: 'baliq', shellfish: 'dengiz mahsulotlari', nuts: "yong'oq", soy: 'soya', sesame: 'kunjut' },
      soldOut: "Hozircha yo'q", soldOutRow: "Hozircha yo'q — summaga kirmaydi",
      unavailableNotice: (n) => `Hozircha yo'q: ${n}. Bu taomlar summaga kirmaydi — ularni olib tashlang yoki ofitsiantdan so'rang.`,
      priceNotice: (n) => `Narx o'zgardi: ${n}. Summa qayta hisoblandi.`,
      listUpdated: "Menyu yangilandi — ro'yxatingizni tekshiring.",
      open: 'Ochiq', closed: 'Yopiq', until: (x) => `${x} gacha`,
      opensToday: (x) => `soat ${x} da ochiladi`, opensTomorrow: (x) => `ertaga soat ${x} da ochiladi`,
      opensOn: (d, x) => `${['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'][d]} kuni soat ${x} da ochiladi`,
      closedForNow: 'Vaqtincha ishlamaydi',
      hours: 'Ish vaqti', daily: 'Har kuni', dayOff: 'dam olish kuni', today: 'Bugun',
      tzNote: (tz) => `Vaqt restoran soati bo'yicha (${tz}).`,
      days: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
      openMap: 'Xaritada ochish', call: "Qo'ng'iroq qilish",
      loading: 'Menyu yuklanmoqda…', loadError: "Menyuni yuklab bo'lmadi", loadErrorHint: "Internetni tekshirib, qayta urinib ko'ring.", retry: 'Qayta urinish',
      emptyMenu: "Menyu tez orada paydo bo'ladi", emptyMenuHint: "Restoran menyuni to'ldirmoqda. Ofitsiantdan so'rang.",
      offline: "Aloqa yo'q — avval yuklangan menyu ko'rsatilmoqda.",
      sendOrder: 'Buyurtmani yuborish', sending: 'Yuborilmoqda…',
      noteLabel: "Buyurtmaga izoh", notePh: "Masalan: menda diabet bor, yong‘oqqa allergiya, hammasi piyozsiz",
      noteHint: "O‘z so‘zlaringiz bilan yozing — ofitsiant va oshpaz darhol ko‘radi.", dishNote: "Taomga istak", dishNotePh: "Masalan: piyozsiz, tuzi kamroq", noteDone: "Tayyor",
      yourTable: 'Stolingiz',
      noTable: "Buyurtma yuborish uchun stolingizdagi QR-kodni skanerlang.",
      badTable: "Bu QR-kod yaroqsiz yoki stol o'chirilgan. Ofitsiantdan yordam so'rang.",
      checkingTable: 'Stol tekshirilmoqda…',
      noServer: "Onlayn buyurtma hali ulanmagan. Ushbu ro'yxatni ofitsiantga ko'rsating.",
      ordersOff: "Hozir menyu orqali buyurtma qabul qilinmayapti. Iltimos, ofitsiantni chaqiring.",
      closedNoOrders: 'Restoran hozir yopiq — buyurtmalar qabul qilinmaydi.',
      removeSold: "Mavjud bo'lmagan taomlarni olib tashlang — shunda buyurtmani yuborish mumkin.",
      errNetwork: "Aloqa yo'q — buyurtma yuborilmadi. Internetni tekshirib, «Buyurtmani yuborish»ni yana bosing.",
      errServer: "Server javob bermadi — buyurtma yuborilmadi. Qayta urinib ko'ring.",
      errTooMany: "Bu stoldan juda ko'p buyurtma. Bir necha daqiqa kuting yoki ofitsiantni chaqiring.",
      errChanged: "Menyu o'zgardi. Buyurtmani tekshirib, qayta yuboring.",
      sentTitle: (n) => `Buyurtma №${n} yuborildi`,
      orderNo: (n) => `Buyurtma №${n}`,
      sentAt: (x) => `${x} da yuborilgan`,
      statuses: { new: 'Yuborildi', accepted: 'Ofitsiant qabul qildi', cooking: 'Tayyorlanmoqda', ready: 'Tayyor — olib kelinmoqda', served: 'Berildi', cancelled: 'Bekor qilindi' },
      meatNames: { beef: "Mol go'shti", lamb: "Qo'y go'shti", horse: "Ot go'shti", chicken: 'Tovuq', fish: 'Baliq', seafood: 'Dengiz mahsulotlari' }, halal: 'Halol', meatLabel: "Go'sht",
      statusHint: { new: 'Buyurtma qabul qilindi — ofitsiant va oshxona uni ko‘rmoqda.', accepted: 'Ofitsiant buyurtmangizni qabul qildi.', cooking: 'Oshpaz buyurtmangizni tayyorlamoqda.', ready: 'Buyurtma tayyor — ofitsiant hozir olib keladi.', served: 'Yoqimli ishtaha!', cancelled: 'Buyurtma bekor qilindi. Iltimos, ofitsiantga murojaat qiling.' },
      statusStale: "Holatni yangilab bo'lmadi — bir necha soniyadan keyin yana tekshiramiz.",
      myOrders: 'Buyurtmalarim', orderMore: 'Yana buyurtma berish', note: 'Izoh',
      servedAt: (a, b) => `${a}–${b} da beriladi`, fromTime: (a) => `${a} dan`, notNowRow: (a, b) => `${a} dan ${b} gacha beriladi`, nowServing: 'Hozir',
      readyToast: 'Buyurtmangiz tayyor — ofitsiant olib kelmoqda!', stepAccepted: 'Qabul qilindi', stepCooking: 'Pishmoqda', stepReady: 'Tayyor',
      tableBill: 'Stol hisobi', tableBillHint: "Stolingizdagi barcha to'lanmagan buyurtmalar — sizniki va do'stlaringizniki.", tableBillEmpty: "Stolda to'lanmagan buyurtma yo'q.", tableTotal: 'Stol bo‘yicha jami',
      reqTitle: 'Nima kerak?', reqCome: 'Shunchaki keling', reqs: { water: 'Suv', napkins: "Salfetka", cutlery: 'Qoshiq-sanchqi', ice: 'Muz', clear: "Stolni yig'ishtirish" }, reqPending: "so'raldi",
      filter: 'Filtrlar', fVeg: "Go'shtsiz", fSpicy: 'Achchiq', fNo: 'Siz', fReset: 'Tozalash', fShow: (n) => `Ko'rsatish (${n})`, fNote: "Tarkib va allergenlar — restoran maʼlumotlari bo'yicha. Allergiyangiz bo'lsa, ofitsiantdan so'rang.",
      hits: 'Xitlar', pairs: 'Bu bilan olishadi', upsell: "Buyurtmaga qo'shasizmi?",
      rateTitle: 'Sizga yoqdimi?', ratePh: 'Nima yoqdi yoki nimani yaxshilash kerak?', rateSend: 'Fikr yuborish', rateThanks: 'Fikringiz uchun rahmat!', rateStar: (n) => `5 dan ${n}`,
      repeat: 'Buyurtmani takrorlash', repeatDone: (n) => `Ro'yxatga qo'shildi: ${n}`, repeatSome: "Ayrim taomlar hozir yo'q — ular qo'shilmadi.",
      prep: (n) => `≈ ${n} daq`, photoOf: (a, b) => `${b} dan ${a}`,
      callWaiter: 'Ofitsiantni chaqirish', askBill: "Hisobni so'rash", waiterComing: 'Ofitsiant kelmoqda', billComing: 'Hisob olib kelinmoqda',
      callSent: 'Ofitsiant signalni oldi va tez orada keladi.', billSent: 'Ofitsiant hisobni olib keladi.', callErr: "Signal yuborilmadi. Ofitsiantni qo'l bilan chaqiring yoki qayta urinib ko'ring.",
      payHow: "Qanday to'laysiz?", payCash: 'Naqd pul', payCard: 'Karta', payQr: 'QR-kod orqali',
      subtotal: 'Taomlar', service: (p) => `Xizmat haqi${p ? ` ${p}%` : ''}`, paid: "To'langan",
      required: 'majburiy', optional: 'ixtiyoriy', addFor: (s) => `Qo'shish · ${s}`, chooseOptions: 'Variantni tanlash',
      edited: (x) => `Restoran buyurtmani ${x} da o'zgartirdi`,
    },
    en: {
      langName: 'English', locale: 'en-US', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Search the menu', clearSearch: 'Clear search',
      order: 'My order', total: 'Total', clear: 'Clear list',
      nothing: 'Nothing found', nothingHint: 'Try another word or browse the full menu.', showAll: 'Show the full menu',
      add: 'Add', remove: 'Remove one', removeItem: 'Remove',
      waiter: 'Show this list to your waiter to place the order.',
      orderEmpty: 'Your list is empty. Add dishes with the plus button.',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: (n) => (n === 1 ? 'pc' : 'pcs'),
      table: 'Table',
      ingredients: 'Ingredients', allergens: 'Allergens',
      close: 'Close', themeDark: 'Dark theme', themeLight: 'Light theme', language: 'Language',
      tags: { hit: 'Popular', new: 'New', spicy: 'Spicy', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'milk', eggs: 'eggs', fish: 'fish', shellfish: 'shellfish', nuts: 'nuts', soy: 'soy', sesame: 'sesame' },
      soldOut: 'Sold out', soldOutRow: 'Sold out right now — not included in the total',
      unavailableNotice: (n) => `Not available right now: ${n}. These items are not included in the total — remove them or ask your waiter.`,
      priceNotice: (n) => `Price changed: ${n}. The total has been recalculated.`,
      listUpdated: 'The menu was updated — please check your list.',
      open: 'Open', closed: 'Closed', until: (x) => `until ${x}`,
      opensToday: (x) => `opens at ${x}`, opensTomorrow: (x) => `opens tomorrow at ${x}`,
      opensOn: (d, x) => `opens ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d]} at ${x}`,
      closedForNow: 'Temporarily closed',
      hours: 'Opening hours', daily: 'Daily', dayOff: 'closed', today: 'Today',
      tzNote: (tz) => `Times are shown in the restaurant's time zone (${tz}).`,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      openMap: 'Open in Maps', call: 'Call',
      loading: 'Loading the menu…', loadError: "Couldn't load the menu", loadErrorHint: 'Check your connection and try again.', retry: 'Try again',
      emptyMenu: 'The menu is coming soon', emptyMenuHint: 'The restaurant is still filling in the menu. Please ask your waiter.',
      offline: 'No connection — showing the menu loaded earlier.',
      sendOrder: 'Send order', sending: 'Sending…',
      noteLabel: "Note for the order", notePh: 'For example: I am diabetic, nut allergy, no onion in anything',
      noteHint: "Write it in your own words — the waiter and the chef will see it right away.", dishNote: "Request for this dish", dishNotePh: "For example: no onion, less salt", noteDone: "Done",
      yourTable: 'Your table',
      noTable: 'To send an order, scan the QR code on your table.',
      badTable: 'This QR code is not valid or the table is disabled. Please ask your waiter.',
      checkingTable: 'Checking your table…',
      noServer: 'Online ordering is not connected yet. Please show this list to your waiter.',
      ordersOff: 'Ordering from the menu is paused right now. Please call your waiter.',
      closedNoOrders: 'The restaurant is closed now — orders are not accepted.',
      removeSold: 'Remove the sold-out dishes from your order, then you can send it.',
      errNetwork: 'No connection — the order was not sent. Check your internet and tap “Send order” again.',
      errServer: 'The server did not respond — the order was not sent. Please try again.',
      errTooMany: 'Too many orders from this table. Please wait a few minutes or call your waiter.',
      errChanged: 'The menu has changed. Please check your order and send it again.',
      sentTitle: (n) => `Order #${n} sent`,
      orderNo: (n) => `Order #${n}`,
      sentAt: (x) => `Sent at ${x}`,
      statuses: { new: 'Sent', accepted: 'Accepted by waiter', cooking: 'Cooking', ready: 'Ready — on its way', served: 'Served', cancelled: 'Cancelled' },
      meatNames: { beef: 'Beef', lamb: 'Lamb', horse: 'Horse meat', chicken: 'Chicken', fish: 'Fish', seafood: 'Seafood' }, halal: 'Halal', meatLabel: 'Meat',
      statusHint: { new: 'Your order is in — the waiter and the kitchen can already see it.', accepted: 'A waiter has accepted your order.', cooking: 'The chef is cooking your order.', ready: 'Your order is ready — the waiter is bringing it.', served: 'Enjoy your meal!', cancelled: 'The order was cancelled. Please talk to your waiter.' },
      statusStale: "Couldn't refresh the status — we'll check again in a few seconds.",
      myOrders: 'My orders', orderMore: 'Order more', note: 'Note',
      servedAt: (a, b) => `Served ${a}–${b}`, fromTime: (a) => `from ${a}`, notNowRow: (a, b) => `Served from ${a} to ${b}`, nowServing: 'Now',
      readyToast: 'Your order is ready — the waiter is bringing it!', stepAccepted: 'Accepted', stepCooking: 'Cooking', stepReady: 'Ready',
      tableBill: 'Table bill', tableBillHint: "All unpaid orders at your table — yours and your friends'.", tableBillEmpty: 'No unpaid orders at this table.', tableTotal: 'Table total',
      reqTitle: 'What do you need?', reqCome: 'Just come over', reqs: { water: 'Water', napkins: 'Napkins', cutlery: 'Cutlery', ice: 'Ice', clear: 'Clear the table' }, reqPending: 'requested',
      filter: 'Filters', fVeg: 'Meat-free', fSpicy: 'Spicy', fNo: 'No', fReset: 'Reset', fShow: (n) => `Show (${n})`, fNote: 'Ingredients and allergens are as provided by the restaurant. If you have an allergy, please check with your waiter.',
      hits: 'Popular', pairs: 'Goes well with', upsell: 'Add to your order?',
      rateTitle: 'How was everything?', ratePh: 'What did you like, or what could be better?', rateSend: 'Send review', rateThanks: 'Thank you for your feedback!', rateStar: (n) => `${n} of 5`,
      repeat: 'Order again', repeatDone: (n) => `Added to your list: ${n}`, repeatSome: "Some dishes aren't available right now — they were skipped.",
      prep: (n) => `≈ ${n} min`, photoOf: (a, b) => `${a} of ${b}`,
      callWaiter: 'Call waiter', askBill: 'Ask for the bill', waiterComing: 'Waiter is coming', billComing: 'Bill is on its way',
      callSent: 'The waiter got your call and will be with you shortly.', billSent: 'The waiter will bring your bill.', callErr: "Couldn't send the call. Please wave to a waiter or try again.",
      payHow: 'How would you like to pay?', payCash: 'Cash', payCard: 'Card', payQr: 'QR code',
      subtotal: 'Items', service: (p) => `Service charge${p ? ` ${p}%` : ''}`, paid: 'Paid',
      required: 'required', optional: 'optional', addFor: (s) => `Add · ${s}`, chooseOptions: 'Choose options',
      edited: (x) => `The restaurant updated your order at ${x}`,
    },
    ar: {
      // цифры привычные (0–9), как на ценниках и в часах работы
      langName: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl',
      menuWord: 'القائمة',
      search: 'ابحث في القائمة', clearSearch: 'مسح البحث',
      order: 'طلبي', total: 'المجموع', clear: 'مسح القائمة',
      nothing: 'لا توجد نتائج', nothingHint: 'جرّب كلمة أخرى أو تصفّح القائمة كاملة.', showAll: 'عرض القائمة كاملة',
      add: 'إضافة', remove: 'إزالة واحد', removeItem: 'إزالة',
      waiter: 'اعرض هذه القائمة على النادل ليأخذ طلبك.',
      orderEmpty: 'قائمتك فارغة. أضف الأطباق بزر الإضافة.',
      g: 'غ', ml: 'مل', kcal: 'سعرة', pcs: (n) => (n >= 3 && n <= 10 ? 'قطع' : 'قطعة'),
      table: 'طاولة',
      ingredients: 'المكونات', allergens: 'مسببات الحساسية',
      close: 'إغلاق', themeDark: 'المظهر الداكن', themeLight: 'المظهر الفاتح', language: 'اللغة',
      tags: { hit: 'الأكثر طلبًا', new: 'جديد', spicy: 'حار', veg: 'نباتي' },
      allergenNames: { gluten: 'غلوتين', milk: 'حليب', eggs: 'بيض', fish: 'سمك', shellfish: 'مأكولات بحرية', nuts: 'مكسرات', soy: 'صويا', sesame: 'سمسم' },
      soldOut: 'غير متوفر', soldOutRow: 'غير متوفر حاليًا — غير محسوب في المجموع',
      unavailableNotice: (n) => `غير متوفر حاليًا: ${n}. هذه الأصناف غير محسوبة في المجموع — أزلها أو اسأل النادل.`,
      priceNotice: (n) => `تغيّر السعر: ${n}. أُعيد حساب المجموع.`,
      listUpdated: 'تم تحديث القائمة — يرجى مراجعة طلبك.',
      open: 'مفتوح', closed: 'مغلق', until: (x) => `حتى ${x}`,
      opensToday: (x) => `يفتح الساعة ${x}`, opensTomorrow: (x) => `يفتح غدًا الساعة ${x}`,
      opensOn: (d, x) => `يفتح يوم ${['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'][d]} الساعة ${x}`,
      closedForNow: 'مغلق مؤقتًا',
      hours: 'ساعات العمل', daily: 'يوميًا', dayOff: 'عطلة', today: 'اليوم',
      tzNote: (tz) => `الأوقات حسب توقيت المطعم (${tz}).`,
      days: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
      openMap: 'فتح في الخرائط', call: 'اتصال',
      loading: 'جارٍ تحميل القائمة…', loadError: 'تعذّر تحميل القائمة', loadErrorHint: 'تحقّق من الاتصال وحاول مرة أخرى.', retry: 'إعادة المحاولة',
      emptyMenu: 'القائمة قريبًا', emptyMenuHint: 'المطعم ما زال يُعدّ القائمة. يرجى سؤال النادل.',
      offline: 'لا يوجد اتصال — تُعرض القائمة المحمّلة سابقًا.',
      sendOrder: 'إرسال الطلب', sending: 'جارٍ الإرسال…',
      noteLabel: "ملاحظة على الطلب", notePh: 'مثال: لدي سكري، حساسية من المكسرات، بدون بصل',
      noteHint: "اكتبها بكلماتك — سيراها النادل والطاهي فوراً.", dishNote: "طلب خاص لهذا الطبق", dishNotePh: "مثلاً: بدون بصل، ملح أقل", noteDone: "تم",
      yourTable: 'طاولتك',
      noTable: 'لإرسال الطلب، امسح رمز QR الموجود على طاولتك.',
      badTable: 'رمز QR هذا غير صالح أو الطاولة معطّلة. يرجى سؤال النادل.',
      checkingTable: 'جارٍ التحقق من الطاولة…',
      noServer: 'الطلب عبر الإنترنت غير مفعّل بعد. يرجى عرض هذه القائمة على النادل.',
      ordersOff: 'الطلب عبر القائمة متوقف حاليًا. يرجى مناداة النادل.',
      closedNoOrders: 'المطعم مغلق الآن — لا تُقبل الطلبات.',
      removeSold: 'أزل الأطباق غير المتوفرة من طلبك، ثم يمكنك إرساله.',
      errNetwork: 'لا يوجد اتصال — لم يُرسل الطلب. تحقّق من الإنترنت واضغط «إرسال الطلب» مرة أخرى.',
      errServer: 'الخادم لم يستجب — لم يُرسل الطلب. حاول مرة أخرى.',
      errTooMany: 'طلبات كثيرة من هذه الطاولة. انتظر بضع دقائق أو اطلب النادل.',
      errChanged: 'تغيّرت القائمة. راجع طلبك ثم أرسله مرة أخرى.',
      sentTitle: (n) => `تم إرسال الطلب رقم ${n}`,
      orderNo: (n) => `الطلب رقم ${n}`,
      sentAt: (x) => `أُرسل الساعة ${x}`,
      statuses: { new: 'أُرسل', accepted: 'قبله النادل', cooking: 'قيد التحضير', ready: 'جاهز — في الطريق', served: 'قُدِّم', cancelled: 'أُلغي' },
      meatNames: { beef: 'لحم بقري', lamb: 'لحم ضأن', horse: 'لحم خيل', chicken: 'دجاج', fish: 'سمك', seafood: 'مأكولات بحرية' }, halal: 'حلال', meatLabel: 'اللحم',
      statusHint: { new: 'وصل طلبك — النادل والمطبخ يرونه الآن.', accepted: 'قبل النادل طلبك.', cooking: 'الطاهي يحضّر طلبك الآن.', ready: 'طلبك جاهز — سيُحضره النادل الآن.', served: 'بالهناء والشفاء!', cancelled: 'أُلغي الطلب. يرجى التحدث إلى النادل.' },
      statusStale: 'تعذّر تحديث الحالة — سنحاول مجددًا بعد ثوانٍ.',
      myOrders: 'طلباتي', orderMore: 'اطلب المزيد', note: 'ملاحظة',
      servedAt: (a, b) => `يُقدَّم ${a}–${b}`, fromTime: (a) => `من ${a}`, notNowRow: (a, b) => `يُقدَّم من ${a} إلى ${b}`, nowServing: 'الآن',
      readyToast: 'طلبك جاهز — النادل في الطريق!', stepAccepted: 'قُبل', stepCooking: 'قيد التحضير', stepReady: 'جاهز',
      tableBill: 'فاتورة الطاولة', tableBillHint: 'كل الطلبات غير المدفوعة على طاولتك — طلباتك وطلبات أصدقائك.', tableBillEmpty: 'لا توجد طلبات غير مدفوعة على الطاولة.', tableTotal: 'إجمالي الطاولة',
      reqTitle: 'ماذا تحتاج؟', reqCome: 'فقط تعال', reqs: { water: 'ماء', napkins: 'مناديل', cutlery: 'أدوات المائدة', ice: 'ثلج', clear: 'تنظيف الطاولة' }, reqPending: 'تم الطلب',
      filter: 'تصفية', fVeg: 'بدون لحم', fSpicy: 'حار', fNo: 'بدون', fReset: 'إعادة ضبط', fShow: (n) => `عرض (${n})`, fNote: 'المكونات ومسببات الحساسية حسب بيانات المطعم. إن كانت لديك حساسية فاسأل النادل.',
      hits: 'الأكثر طلبًا', pairs: 'يُطلب معه', upsell: 'هل تضيف إلى طلبك؟',
      rateTitle: 'كيف كانت تجربتك؟', ratePh: 'ما الذي أعجبك أو ما الذي يمكن تحسينه؟', rateSend: 'إرسال التقييم', rateThanks: 'شكرًا على رأيك!', rateStar: (n) => `${n} من 5`,
      repeat: 'كرر الطلب', repeatDone: (n) => `أُضيف إلى القائمة: ${n}`, repeatSome: 'بعض الأطباق غير متوفرة الآن — لم تُضف.',
      prep: (n) => `≈ ${n} د`, photoOf: (a, b) => `${a} من ${b}`,
      callWaiter: 'استدعاء النادل', askBill: 'طلب الفاتورة', waiterComing: 'النادل في الطريق', billComing: 'الفاتورة في الطريق',
      callSent: 'وصل طلبك إلى النادل وسيأتي قريبًا.', billSent: 'سيُحضر النادل الفاتورة.', callErr: 'تعذّر إرسال الطلب. يرجى الإشارة إلى النادل أو المحاولة مجددًا.',
      payHow: 'كيف تودّ الدفع؟', payCash: 'نقدًا', payCard: 'بالبطاقة', payQr: 'رمز QR',
      subtotal: 'الأطباق', service: (p) => `رسوم الخدمة${p ? ` ${p}%` : ''}`, paid: 'مدفوع',
      required: 'إلزامي', optional: 'اختياري', addFor: (s) => `إضافة · ${s}`, chooseOptions: 'اختيار الخيارات',
      edited: (x) => `عدّل المطعم طلبك في ${x}`,
    },
    ms: {
      langName: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Cari dalam menu', clearSearch: 'Kosongkan carian',
      order: 'Pesanan saya', total: 'Jumlah', clear: 'Kosongkan senarai',
      nothing: 'Tiada hasil', nothingHint: 'Cuba perkataan lain atau lihat menu penuh.', showAll: 'Tunjukkan menu penuh',
      add: 'Tambah', remove: 'Buang satu', removeItem: 'Buang',
      waiter: 'Tunjukkan senarai ini kepada pelayan untuk membuat pesanan.',
      orderEmpty: 'Senarai anda kosong. Tambah hidangan dengan butang tambah.',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: () => 'biji',
      table: 'Meja',
      ingredients: 'Bahan-bahan', allergens: 'Alergen',
      close: 'Tutup', themeDark: 'Tema gelap', themeLight: 'Tema cerah', language: 'Bahasa',
      tags: { hit: 'Popular', new: 'Baharu', spicy: 'Pedas', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'susu', eggs: 'telur', fish: 'ikan', shellfish: 'kerang-kerangan', nuts: 'kacang', soy: 'soya', sesame: 'bijan' },
      soldOut: 'Habis', soldOutRow: 'Habis buat masa ini — tidak termasuk dalam jumlah',
      unavailableNotice: (n) => `Tiada buat masa ini: ${n}. Item ini tidak dikira dalam jumlah — buang atau tanya pelayan.`,
      priceNotice: (n) => `Harga berubah: ${n}. Jumlah telah dikira semula.`,
      listUpdated: 'Menu telah dikemas kini — sila semak senarai anda.',
      open: 'Buka', closed: 'Tutup', until: (x) => `hingga ${x}`,
      opensToday: (x) => `buka pada ${x}`, opensTomorrow: (x) => `buka esok pada ${x}`,
      opensOn: (d, x) => `buka hari ${['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'][d]} pada ${x}`,
      closedForNow: 'Ditutup buat sementara',
      hours: 'Waktu operasi', daily: 'Setiap hari', dayOff: 'tutup', today: 'Hari ini',
      tzNote: (tz) => `Waktu mengikut zon waktu restoran (${tz}).`,
      days: ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'],
      openMap: 'Buka dalam Peta', call: 'Hubungi',
      loading: 'Memuatkan menu…', loadError: 'Menu gagal dimuatkan', loadErrorHint: 'Semak sambungan dan cuba lagi.', retry: 'Cuba lagi',
      emptyMenu: 'Menu akan datang', emptyMenuHint: 'Restoran sedang menyediakan menu. Sila tanya pelayan.',
      offline: 'Tiada sambungan — menu yang dimuatkan sebelum ini dipaparkan.',
      sendOrder: 'Hantar pesanan', sending: 'Menghantar…',
      noteLabel: "Nota pesanan", notePh: 'Contoh: saya ada kencing manis, alahan kacang, semua tanpa bawang',
      noteHint: "Tulis dengan kata-kata anda — pelayan dan tukang masak akan nampak serta-merta.", dishNote: "Permintaan untuk hidangan ini", dishNotePh: "Contoh: tanpa bawang, kurang garam", noteDone: "Siap",
      yourTable: 'Meja anda',
      noTable: 'Untuk menghantar pesanan, imbas kod QR di meja anda.',
      badTable: 'Kod QR ini tidak sah atau meja telah dinyahaktifkan. Sila minta bantuan pelayan.',
      checkingTable: 'Menyemak meja…',
      noServer: 'Pesanan dalam talian belum disambungkan. Sila tunjukkan senarai ini kepada pelayan.',
      ordersOff: 'Pesanan melalui menu ditangguhkan buat masa ini. Sila panggil pelayan.',
      closedNoOrders: 'Restoran ditutup sekarang — pesanan tidak diterima.',
      removeSold: 'Buang hidangan yang habis daripada pesanan, kemudian anda boleh menghantarnya.',
      errNetwork: 'Tiada sambungan — pesanan tidak dihantar. Semak internet dan tekan «Hantar pesanan» sekali lagi.',
      errServer: 'Pelayan tidak menjawab — pesanan tidak dihantar. Sila cuba lagi.',
      errTooMany: 'Terlalu banyak pesanan dari meja ini. Tunggu beberapa minit atau panggil pelayan.',
      errChanged: 'Menu telah berubah. Semak pesanan anda dan hantar sekali lagi.',
      sentTitle: (n) => `Pesanan #${n} dihantar`,
      orderNo: (n) => `Pesanan #${n}`,
      sentAt: (x) => `Dihantar pada ${x}`,
      statuses: { new: 'Dihantar', accepted: 'Diterima oleh pelayan', cooking: 'Sedang dimasak', ready: 'Siap — sedang dihantar', served: 'Dihidang', cancelled: 'Dibatalkan' },
      meatNames: { beef: 'Daging lembu', lamb: 'Daging kambing', horse: 'Daging kuda', chicken: 'Ayam', fish: 'Ikan', seafood: 'Makanan laut' }, halal: 'Halal', meatLabel: 'Daging',
      statusHint: { new: 'Pesanan diterima — pelayan dan dapur sudah nampak.', accepted: 'Pelayan telah menerima pesanan anda.', cooking: 'Tukang masak sedang menyediakan pesanan anda.', ready: 'Pesanan anda siap — pelayan sedang membawanya.', served: 'Selamat menjamu selera!', cancelled: 'Pesanan dibatalkan. Sila berjumpa pelayan.' },
      statusStale: 'Status gagal dikemas kini — kami akan cuba lagi sebentar lagi.',
      myOrders: 'Pesanan saya', orderMore: 'Pesan lagi', note: 'Nota',
      servedAt: (a, b) => `Dihidang ${a}–${b}`, fromTime: (a) => `dari ${a}`, notNowRow: (a, b) => `Dihidang dari ${a} hingga ${b}`, nowServing: 'Sekarang',
      readyToast: 'Pesanan anda siap — pelayan sedang membawanya!', stepAccepted: 'Diterima', stepCooking: 'Dimasak', stepReady: 'Siap',
      tableBill: 'Bil meja', tableBillHint: 'Semua pesanan belum dibayar di meja anda — milik anda dan rakan.', tableBillEmpty: 'Tiada pesanan belum dibayar di meja ini.', tableTotal: 'Jumlah meja',
      reqTitle: 'Apa yang anda perlukan?', reqCome: 'Datang sahaja', reqs: { water: 'Air', napkins: 'Tisu', cutlery: 'Sudu garpu', ice: 'Ais', clear: 'Kemas meja' }, reqPending: 'sudah diminta',
      filter: 'Penapis', fVeg: 'Tanpa daging', fSpicy: 'Pedas', fNo: 'Tanpa', fReset: 'Set semula', fShow: (n) => `Tunjuk (${n})`, fNote: 'Bahan dan alergen mengikut maklumat restoran. Jika anda alah, sila tanya pelayan.',
      hits: 'Popular', pairs: 'Sesuai dengan', upsell: 'Tambah ke pesanan?',
      rateTitle: 'Bagaimana pengalaman anda?', ratePh: 'Apa yang anda suka, atau apa yang boleh diperbaiki?', rateSend: 'Hantar ulasan', rateThanks: 'Terima kasih atas ulasan anda!', rateStar: (n) => `${n} daripada 5`,
      repeat: 'Pesan semula', repeatDone: (n) => `Ditambah ke senarai: ${n}`, repeatSome: 'Sesetengah hidangan tiada sekarang — tidak ditambah.',
      prep: (n) => `≈ ${n} min`, photoOf: (a, b) => `${a} daripada ${b}`,
      callWaiter: 'Panggil pelayan', askBill: 'Minta bil', waiterComing: 'Pelayan sedang datang', billComing: 'Bil sedang dibawa',
      callSent: 'Pelayan telah menerima panggilan anda dan akan datang sebentar lagi.', billSent: 'Pelayan akan membawa bil anda.', callErr: 'Panggilan tidak dapat dihantar. Sila lambai pelayan atau cuba lagi.',
      payHow: 'Bagaimana anda mahu membayar?', payCash: 'Tunai', payCard: 'Kad', payQr: 'Kod QR',
      subtotal: 'Hidangan', service: (p) => `Caj perkhidmatan${p ? ` ${p}%` : ''}`, paid: 'Dibayar',
      required: 'wajib', optional: 'pilihan', addFor: (s) => `Tambah · ${s}`, chooseOptions: 'Pilih pilihan',
      edited: (x) => `Restoran telah mengemas kini pesanan anda pada ${x}`,
    },
  };

  // ---------- Источники данных ----------
  const BASE = window.MENU;                 // data.js — если сервер не подключён
  const SCH = window.MenuSchedule;
  const B = window.MENU_BACKEND || {};
  const ONLINE = !!(B.url && B.key);        // подключена база Supabase (config.js)
  const LANGS = BASE.languages.filter((l) => T[l]);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('menu:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('menu:' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const nonEmpty = (o) => (o && typeof o === 'object' && Object.values(o).some((v) => String(v || '').trim()) ? o : null);

  // Единый вид меню, откуда бы оно ни пришло
  function fromBase(b) {
    const r = b.restaurant;
    return {
      restaurant: {
        name: r.name, tagline: r.tagline, logoUrl: r.logoUrl || null,
        currency: r.currency, currencyBefore: !!r.currencyBefore, timezone: r.timezone, schedule: r.schedule,
        address: nonEmpty(r.address), mapUrl: r.mapUrl || null, phone: r.phone || '', footer: nonEmpty(r.footer),
        ordersEnabled: false, ordersWhenClosed: false,
        servicePct: 0, taxPct: 0, taxName: 'SST', taxOnService: true,
        halal: !!r.halal, halalNote: nonEmpty(r.halalNote),
        defaultLanguage: b.defaultLanguage,
      },
      categories: b.categories.map((c) => ({ id: c.id, name: c.name, from: c.from || null, to: c.to || null })),
      dishes: b.dishes.filter((d) => !d.hidden).map((d) => ({
        id: d.id, category: d.category, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
        price: Number(d.price), weight: d.weight ?? null, unit: d.unit || 'g', kcal: d.kcal ?? null, photo: d.photo || null,
        tags: d.tags || [], allergens: d.allergens || [], meat: d.meat || [], available: d.available !== false,
        options: Array.isArray(d.options) ? d.options : [], prepMin: d.prepMin || null, pairs: d.pairs || [],
      })),
    };
  }

  function fromDb(st, cats, dishes) {
    const shown = cats.filter((c) => !c.hidden).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
    const ids = new Set(shown.map((c) => c.id));
    return {
      restaurant: {
        name: st.name, tagline: nonEmpty(st.tagline), logoUrl: st.logo_url || null,
        currency: st.currency, currencyBefore: st.currency_before, timezone: st.timezone, schedule: st.schedule,
        address: nonEmpty(st.address), mapUrl: st.map_url || null, phone: st.phone || '', footer: nonEmpty(st.footer),
        ordersEnabled: !!st.orders_enabled, ordersWhenClosed: !!st.orders_when_closed,
        servicePct: Number(st.service_pct) || 0, taxPct: Number(st.tax_pct) || 0, taxName: st.tax_name || 'SST', taxOnService: st.tax_on_service !== false,
        halal: !!st.halal, halalNote: nonEmpty(st.halal_note),
        defaultLanguage: st.default_language,
      },
      categories: shown.map((c) => ({ id: c.id, name: c.name, from: c.avail_from || null, to: c.avail_to || null })),
      dishes: dishes.filter((d) => !d.hidden && ids.has(d.category_id))
        .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
        .map((d) => ({
          id: d.id, category: d.category_id, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
          price: Number(d.price), weight: d.weight, unit: d.unit, kcal: d.kcal, photo: d.photo_url || null,
          tags: d.tags || [], allergens: d.allergens || [], meat: d.meat || [], available: d.available,
          options: Array.isArray(d.options) ? d.options : [], prepMin: d.prep_min || null, pairs: Array.isArray(d.pairs) ? d.pairs : [],
        })),
    };
  }

  // ---------- Состояние ----------
  let M = null;            // текущее меню
  let state = 'ready';     // ready | loading | error
  let stale = false;       // показываем сохранённое меню, потому что нет связи
  if (ONLINE) {
    const cached = store.get('cache', null);
    if (cached?.restaurant && Array.isArray(cached.dishes)) M = cached; else state = 'loading';
  } else {
    M = fromBase(BASE);
  }
  let byId = {};
  const index = () => { byId = Object.fromEntries((M?.dishes || []).map((d) => [d.id, d])); };
  index();

  // Язык: выбранный гостем → язык телефона → язык ресторана по умолчанию
  let lang = store.get('lang', null);
  if (!LANGS.includes(lang)) {
    const phone = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
    const def = M?.restaurant.defaultLanguage || BASE.defaultLanguage;
    lang = phone.find((l) => LANGS.includes(l)) || (LANGS.includes(def) ? def : LANGS[0]);
  }

  // Список гостя: { id: количество }. Хранится на телефоне, никуда не отправляется.
  let order = store.get('order', {});
  if (!order || typeof order !== 'object' || Array.isArray(order)) order = {};
  for (const id of Object.keys(order)) if (!(order[id] > 0 && order[id] <= 99)) delete order[id];
  // Что гость видел: цена и название на момент добавления — чтобы предупредить об изменениях
  let seen = store.get('seen', {});
  if (!seen || typeof seen !== 'object') seen = {};
  let priceChanges = [];   // [{ id, from, to }]
  let attention = false;   // в списке что-то изменилось, гость ещё не открыл его

  // Стол из QR: ?t=<код стола>. Код проверяет сервер — придумать номер стола нельзя.
  const TABLE_TTL = 6 * 60 * 60 * 1000;
  let tableToken = '';
  let table = '';             // название стола, подтверждённое сервером
  let tableState = 'none';    // none — нет кода | checking | ok | invalid | unknown (нет связи)
  {
    const p = new URLSearchParams(location.search);
    const fromUrl = (p.get('t') || '').trim().toLowerCase();
    if (p.has('t')) {
      tableToken = /^[a-f0-9]{20}$/.test(fromUrl) ? fromUrl : '';
      tableState = tableToken ? 'checking' : 'invalid';
      store.set('table', tableToken ? { token: tableToken, at: Date.now() } : null);
    } else {
      const saved = store.get('table', null);
      if (saved?.token && Date.now() - saved.at < TABLE_TTL) {
        tableToken = saved.token;
        table = saved.label || '';
        tableState = 'checking';
      }
    }
  }

  // Заказы гостя: черновик комментария, защита от повторной отправки, отправленные заказы
  let note = store.get('note', '') || '';
  // пожелание к конкретному блюду в списке: { ключ строки: «без лука, поменьше соли» }
  let dishNotes = store.get('dishNotes', {}) || {};
  let noteOpen = null;   // у какой строки открыт редактор пожелания
  const saveDishNotes = () => store.set('dishNotes', dishNotes);
  // быстрые кнопки дописывают/убирают фразу в тексте через запятую
  let sending = false;
  let sendError = '';
  let pendingKey = store.get('pendingKey', null);  // { key, sig } — один ключ на одну попытку заказа
  let myOrders = (store.get('myOrders', []) || []).filter((o) => o && o.id && o.token && Date.now() - o.at < 24 * 60 * 60 * 1000);
  let tracked = store.get('tracked', {}) || {};     // id → последний ответ сервера по заказу
  let trackStale = false;
  let justSent = null;

  let query = '';
  let sheet = null;        // { type: 'dish', id } | { type: 'order' } | { type: 'lang' } | { type: 'hours' }
  let lastFocus = null;
  let activeCat = null;
  let spyLockUntil = 0;

  // ---------- Помощники ----------
  const t = (k) => T[lang][k];
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.ru || Object.values(o).find(Boolean) || '');
  const R = () => M.restaurant;
  const money = (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    const num = new Intl.NumberFormat(t('locale'), { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
    return R().currencyBefore ? `${R().currency} ${num}` : `${num} ${R().currency}`;
  };
  const amount = (d) => {
    if (!d.weight) return '';
    const unit = d.unit === 'pcs' ? t('pcs')(d.weight) : t(d.unit === 'ml' ? 'ml' : 'g');
    return `${d.weight} ${unit}`;
  };
  const clock = (hhmm) => {
    const m = SCH.mins(hhmm);
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    if (lang !== 'en') return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
  };
  // время подачи категории (например, завтрак 06:00–11:00) — по часам ресторана
  const catOf = (d) => (M?.categories || []).find((c) => c.id === d?.category);
  function catOpen(c) {
    if (!c?.from || !c?.to) return true;
    const m = SCH.localNow(R().timezone, new Date()).min;
    const f = SCH.mins(c.from);
    const to = SCH.mins(c.to);
    return to > f ? m >= f && m < to : m >= f || m < to;
  }
  const orderable = (d) => !!d && d.available && catOpen(catOf(d));
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const itemName = (id) => L(byId[id]?.name) || L((seen[id] || Object.entries(seen).find(([k]) => parseKey(k).id === id)?.[1])?.name) || '…';

  // Строка списка: ключ «блюдо» или «блюдо|группа:вариант,…» — одно блюдо с разными вариантами = разные строки
  const makeKey = (id, opts) => (opts && opts.length ? `${id}|${[...opts].sort().join(',')}` : id);
  const parseKey = (key) => { const [id, rest] = String(key).split('|'); return { id, opts: rest ? rest.split(',').filter(Boolean) : [] }; };
  const hasOptions = (d) => Array.isArray(d?.options) && d.options.length > 0;
  // выбранные варианты по ТЕКУЩЕМУ меню: подходят ли, цена за штуку, подписи
  function optInfo(d, opts) {
    if (!d) return { ok: false, unit: 0, names: [] };
    let unit = Number(d.price);
    let found = 0;
    let ok = true;
    const names = [];
    for (const g of d.options || []) {
      let n = 0;
      for (const c of g.choices || []) {
        if (opts.includes(`${g.id}:${c.id}`)) { n += 1; found += 1; unit += Number(c.price) || 0; names.push(L(c.name)); }
      }
      if ((g.required && !n) || (!g.multi && n > 1)) ok = false;
    }
    if (found !== opts.length) ok = false;
    return { ok, unit: Math.max(0, Math.round(unit * 100) / 100), names };
  }
  const lineName = (key) => {
    const { id, opts } = parseKey(key);
    const names = optInfo(byId[id], opts).names;
    return names.length ? `${itemName(id)} (${names.join(', ')})` : itemName(id);
  };
  const dishCount = (id) => Object.entries(order).reduce((n, [k, q]) => n + (parseKey(k).id === id ? q : 0), 0);
  // сервисный сбор и налог — та же формула, что на сервере (сервер всё равно пересчитает)
  function charges(sum) {
    const r = R();
    // считаем в сенах (целых), как сервер: 16,75 × 6% = 1,01, а не 1,00
    const sen = Math.round(sum * 100);
    const pctSen = (base, p) => Math.round((base * (Number(p) || 0)) / 100 + 1e-9);
    const service = pctSen(sen, r.servicePct);
    const tax = pctSen(sen + (r.taxOnService ? service : 0), r.taxPct);
    return { sub: sen / 100, service: service / 100, tax: tax / 100, total: (sen + service + tax) / 100 };
  }
  const pct = (x) => String(Math.round(Number(x) * 100) / 100);
  function chargesHtml(c, withPct) {
    const r = R();
    const total = `<div class="order-total"><span>${esc(t('total'))}</span><strong>${money(c.total)}</strong></div>`;
    if (!Number(c.service) && !Number(c.tax)) return total;
    return `<dl class="charges">
      <div><dt>${esc(t('subtotal'))}</dt><dd>${money(c.sub)}</dd></div>
      ${Number(c.service) ? `<div><dt>${esc(t('service')(withPct ? pct(r.servicePct) : ''))}</dt><dd>${money(c.service)}</dd></div>` : ''}
      ${Number(c.tax) ? `<div><dt>${esc(withPct ? `${r.taxName} ${pct(r.taxPct)}%` : r.taxName)}</dt><dd>${money(c.tax)}</dd></div>` : ''}
    </dl>${total}`;
  }

  // фильтры гостя: без мяса / острое / без аллергена (по данным ресторана)
  let filters = (() => { try { return JSON.parse(sessionStorage.getItem('menu:filters') || '{}') || {}; } catch { return {}; } })();
  const filterCount = () => (filters.veg ? 1 : 0) + (filters.spicy ? 1 : 0) + (filters.no || []).length;
  const passFilters = (d) => (!filters.veg || (d.tags || []).includes('veg'))
    && (!filters.spicy || (d.tags || []).includes('spicy'))
    && !(filters.no || []).some((a) => (d.allergens || []).includes(a));
  function saveFilters() { try { sessionStorage.setItem('menu:filters', JSON.stringify(filters)); } catch { /* ok */ } }

  function matches(d) {
    if (!passFilters(d)) return false;
    if (!query) return true;
    const hay = norm(LANGS.map((l) => `${d.name?.[l] || ''} ${d.desc?.[l] || ''}`).join(' '));
    return query.split(/\s+/).every((w) => hay.includes(w));
  }

  // ---------- Часы работы ----------
  function statusInfo() {
    const st = SCH.status(R().schedule, R().timezone);
    if (st.never) return { open: false, text: t('closedForNow') };
    if (st.open) return { open: true, text: `${t('open')} · ${t('until')(clock(st.closesAt))}` };
    const at = clock(st.opensAt);
    const when = st.opensIn === 0 ? t('opensToday')(at) : st.opensIn === 1 ? t('opensTomorrow')(at) : t('opensOn')(st.opensDay, at);
    return { open: false, text: `${t('closed')} · ${when}` };
  }
  function hoursLine() {
    const s = R().schedule;
    if (!Array.isArray(s) || s.length !== 7) return '';
    const g = SCH.groups(s);
    if (g.length === 1 && !g[0].closed) return `${t('daily')} ${clock(g[0].open)}–${clock(g[0].close)}`;
    const today = s[SCH.localNow(R().timezone, new Date()).day];
    return `${t('today')}: ${today.closed ? t('dayOff') : `${clock(today.open)}–${clock(today.close)}`}`;
  }

  // ---------- Шапка ----------
  function monogram(name) {
    const words = String(name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    return (words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase();
  }

  function renderHeader() {
    document.documentElement.lang = lang;
    document.documentElement.dir = t('dir');
    $('#search').placeholder = t('search');
    $('#search-clear').setAttribute('aria-label', t('clearSearch'));
    $('#sheet-close').setAttribute('aria-label', t('close'));
    const langBtn = $('#lang-btn');
    langBtn.hidden = LANGS.length < 2;
    langBtn.innerHTML = `${icon('globe')}<span>${esc(lang.toUpperCase())}</span>`;
    langBtn.setAttribute('aria-label', `${t('language')}: ${t('langName')}`);
    const dark = document.documentElement.dataset.theme === 'dark';
    const themeBtn = $('#theme-btn');
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon');
    themeBtn.setAttribute('aria-label', dark ? t('themeLight') : t('themeDark'));

    if (!M) {
      document.title = t('menuWord');
      $('#r-name').textContent = '';
      $('#r-tagline').textContent = '';
      $('#logo').innerHTML = '';
      $('#r-info').innerHTML = '';
      $('#foot').textContent = '';
      return;
    }
    const r = R();
    document.title = `${r.name} — ${t('menuWord')}`;
    $('#r-name').textContent = r.name;
    $('#r-tagline').textContent = L(r.tagline);
    $('#logo').innerHTML = r.logoUrl ? `<img src="${esc(r.logoUrl)}" alt="">` : esc(monogram(r.name));

    const st = statusInfo();
    const badges = [];
    if (table && tableState !== 'invalid') badges.push(`<span class="badge">${icon('table', 'sm')}${esc(t('table'))} ${esc(table)}</span>`);
    badges.push(`<button type="button" class="badge ${st.open ? 'ok' : 'off'}" data-sheet="hours" aria-label="${esc(`${st.text}. ${t('hours')}`)}"><span class="dot"></span>${esc(st.text)}${icon('chevron', 'sm chev')}</button>`);
    if (r.halal) {
      badges.push(r.halalNote
        ? `<button type="button" class="badge halal" data-sheet="halal">${icon('check', 'sm')}${esc(t('halal'))}</button>`
        : `<span class="badge halal">${icon('check', 'sm')}${esc(t('halal'))}</span>`);
    }

    const links = [];
    // часы работы открываются нажатием на «Открыто / Закрыто» — отдельной строки нет, меню видно раньше
    const addr = L(r.address);
    if (addr) {
      const q = r.address?.en || r.address?.ms || addr;
      const href = r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${q}`)}`;
      links.push(`<a class="info-link" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(`${t('openMap')}: ${addr}`)}">${icon('pin')}
        <span class="grow">${esc(addr)}</span>${icon('chevron', 'chev')}</a>`);
    }
    if (r.phone) {
      links.push(`<a class="info-link" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}" aria-label="${esc(`${t('call')}: ${r.phone}`)}">${icon('phone')}
        <span class="grow"><bdi dir="ltr">${esc(r.phone)}</bdi></span>${icon('chevron', 'chev')}</a>`);
    }
    $('#r-info').innerHTML = `<div class="info-row">${badges.join('')}</div>${links.length ? `<div class="info-grid">${links.join('')}</div>` : ''}`;
    $('#foot').textContent = L(r.footer);
  }

  // ---------- Карточки ----------
  // заглушка без фото: своя картинка у каждой категории (казан, пиала, шампур…) — не фото еды
  const PH = [['kazan', /plov|плов|palov|osh|بلوف/i], ['bowl', /soup|суп|шурп|sho'?rva|sup|شورب/i], ['skewer', /grill|шашлык|кебаб|мангал|kabob|sate|مشاوي/i],
    ['samsa', /bakery|samsa|самс|выпеч|лепёш|non|roti|معجنات/i], ['salad', /salad|салат|سلط/i], ['sweet', /dessert|десерт|сладк|shirin|pencuci|حلوي/i],
    ['tea', /drink|напит|чай|tea|ichimlik|minuman|مشروب/i], ['egg', /breakfast|завтрак|nonushta|sarapan|فطور/i], ['manty', /main|горяч|manty|issiq|utama|رئيسي/i]];
  function phKind(d) {
    const c = catOf(d);
    const hay = `${c?.id || ''} ${Object.values(c?.name || {}).join(' ')}`;
    return (PH.find(([, re]) => re.test(hay)) || ['dish'])[0];
  }
  function photo(d, cls = '', flag = false) {
    const kind = d?.photo ? '' : phKind(d);
    const img = d?.photo
      ? `<img src="${esc(d.photo)}" alt="${esc(L(d.name))}" loading="lazy" decoding="async" width="800" height="600" onload="this.dataset.ok=1" onerror="this.dataset.ok=1">`
      : icon(kind === 'dish' ? 'dish' : `ph-${kind}`);
    const sold = flag && d && !d.available ? `<span class="sold-flag">${esc(t('soldOut'))}</span>` : '';
    return `<div class="photo ${cls}${d?.photo ? ' has-img' : ` ph ph-${kind}`}">${img}${sold}</div>`;
  }

  function tagsHtml(d) {
    if (!d.tags?.length) return '';
    return `<div class="tags">${d.tags.map((k) => `<span class="tag tag-${esc(k)}">${esc(t('tags')[k] || k)}</span>`).join('')}</div>`;
  }

  function control(id) {
    const dd = byId[id];
    if (dd?.available && !catOpen(catOf(dd))) return `<span class="sold later">${esc(t('fromTime')(clock(catOf(dd).from)))}</span>`;
    if (!orderable(dd)) return `<span class="sold">${esc(t('soldOut'))}</span>`;
    if (hasOptions(byId[id])) {
      const c = dishCount(id);
      return `<button type="button" class="add${c ? ' has-n' : ''}" data-act="pick" data-id="${esc(id)}" aria-label="${esc(`${t('chooseOptions')}: ${itemName(id)}`)}">${c ? `<span class="add-n">${c}</span>` : ''}${icon('plus')}</button>`;
    }
    const n = order[id] || 0;
    const plus = `<button type="button" data-act="inc" data-id="${esc(id)}" aria-label="${esc(`${t('add')}: ${itemName(id)}`)}">${icon('plus')}</button>`;
    if (!n) return plus.replace('<button', '<button class="add"');
    return `<div class="stepper"><button type="button" data-act="dec" data-id="${esc(id)}" aria-label="${esc(`${t('remove')}: ${itemName(id)}`)}">${icon('minus')}</button><span aria-live="polite">${n}</span>${plus}</div>`;
  }

  // кнопки количества у строки списка (строка = блюдо + варианты)
  function lineControl(key) {
    const n = order[key] || 0;
    return `<div class="stepper"><button type="button" data-act="dec" data-key="${esc(key)}" aria-label="${esc(`${t('remove')}: ${lineName(key)}`)}">${icon('minus')}</button><span aria-live="polite">${n}</span><button type="button" data-act="inc" data-key="${esc(key)}" aria-label="${esc(`${t('add')}: ${lineName(key)}`)}">${icon('plus')}</button></div>`;
  }

  // «Конина · рис, морковь, казы» — только из данных ресторана
  const meatText = (d) => (d.meat || []).map((m) => t('meatNames')[m]).filter(Boolean).join(', ');
  function compoHtml(d) {
    const meat = meatText(d);
    const ingr = L(d.ingredients);
    if (!meat && !ingr) return '';
    return `<p class="compo">${meat ? `<b>${esc(meat)}</b>` : ''}${meat && ingr ? ' · ' : ''}${ingr ? esc(ingr) : ''}</p>`;
  }

  function card(d) {
    const desc = L(d.desc);
    const compo = compoHtml(d);
    return `
      <article class="card${d.available ? '' : ' is-sold'}" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        ${photo(d, '', true)}
        <div class="card-body">
          ${tagsHtml(d)}
          <h3>${esc(L(d.name))}</h3>
          ${compo || (desc ? `<p class="desc">${esc(desc)}</p>` : '<p class="desc"></p>')}
          <div class="card-foot">
            <div class="price-wrap"><span class="price">${money(d.price)}</span><span class="amount">${esc([amount(d), d.prepMin ? t('prep')(d.prepMin) : ''].filter(Boolean).join(' · '))}</span></div>
            <div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div>
          </div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const main = $('#menu');
    const cats = $('#cats');
    if (state === 'loading' && !M) {
      cats.innerHTML = '';
      main.innerHTML = `<p class="sr-only" role="status">${esc(t('loading'))}</p>
        ${[0, 1].map(() => `<div class="skel-title"></div><div class="grid">${'<div class="skel"></div>'.repeat(3)}</div>`).join('')}`;
      return;
    }
    if (state === 'error' && !M) {
      cats.innerHTML = '';
      main.innerHTML = `<div class="state" role="alert">${icon('alert')}<h2>${esc(t('loadError'))}</h2>
        <p>${esc(t('loadErrorHint'))}</p><button type="button" class="btn" data-act="retry">${icon('refresh')}${esc(t('retry'))}</button></div>`;
      return;
    }

    // категория со временем подачи, которая сейчас подаётся (например, завтрак утром) — первой
    const groups = M.categories
      .map((c, i) => ({ c, i, items: M.dishes.filter((d) => d.category === c.id && matches(d)) }))
      .filter((g) => g.items.length)
      .sort((a, b) => ((b.c.from && catOpen(b.c)) - (a.c.from && catOpen(a.c))) || a.i - b.i);
    lastOpenSig = M.categories.map((c) => catOpen(c)).join();

    cats.innerHTML = groups.map(({ c }) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(L(c.name))}</button>`).join('');

    const offline = (stale ? `<p class="notice info" role="status">${icon('alert')}<span>${esc(t('offline'))}</span></p>` : '')
      + (ONLINE && tableState === 'invalid' ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('badTable'))}</span></p>` : '');
    if (!M.dishes.length) {
      main.innerHTML = `${offline}<div class="state">${icon('dish')}<h2>${esc(t('emptyMenu'))}</h2><p>${esc(t('emptyMenuHint'))}</p></div>`;
    } else if (!groups.length) {
      main.innerHTML = `${offline}<div class="state">${icon('search')}<h2>${esc(t('nothing'))}</h2>
        <p>${esc(t('nothingHint'))}</p><button type="button" class="btn ghost" data-act="show-all">${esc(t('showAll'))}</button></div>`;
    } else {
      main.innerHTML = offline + hitsHtml() + groups.map(({ c, items }) => `
        <section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
          <div class="cat-title"><h2 id="h-${esc(c.id)}">${esc(L(c.name))}</h2><span>${items.length}</span>${c.from ? `<span class="cat-time${catOpen(c) ? ' now' : ''}">${icon('clock', 'sm')}${esc(catOpen(c) ? `${t('nowServing')} · ${clock(c.from)}–${clock(c.to)}` : t('servedAt')(clock(c.from), clock(c.to)))}</span>` : ''}</div>
          <div class="grid">${items.map(card).join('')}</div>
        </section>`).join('');
    }
    activeCat = null;
    onScroll();
  }

  let lastOpenSig = '';

  // ---------- «Хиты» и «С этим берут» ----------
  let stats = store.get('stats', { popular: [], pairs: {} }) || { popular: [], pairs: {} };
  async function loadStats() {
    if (!ONLINE) return;
    try {
      const r = await rpc('menu_stats', {});
      const v = Array.isArray(r) ? r[0] : r;
      if (v && Array.isArray(v.popular)) {
        const changed = JSON.stringify(v) !== JSON.stringify(stats);
        stats = v;
        store.set('stats', stats);
        if (changed) renderMenu();
      }
    } catch { /* без рекомендаций */ }
  }
  function hitsList() {
    const ids = [...(stats.popular || []), ...(M?.dishes || []).filter((d) => (d.tags || []).includes('hit')).map((d) => d.id)];
    return [...new Set(ids)].map((id) => byId[id]).filter((d) => d && d.available).slice(0, 8);
  }
  function miniCard(d) {
    return `<article class="mini" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
      ${photo(d, 'mini-photo')}<b>${esc(L(d.name))}</b>
      <div class="mini-foot"><span class="price">${money(d.price)}</span><div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div></div></article>`;
  }
  function hitsHtml() {
    if (query || filterCount()) return '';
    const list = hitsList();
    if (list.length < 3) return '';
    return `<section class="hits" aria-labelledby="h-hits"><div class="cat-title"><h2 id="h-hits">${esc(t('hits'))}</h2></div>
      <div class="hits-row">${list.map(miniCard).join('')}</div></section>`;
  }
  // к блюду: сначала то, что указал ресторан, потом что чаще берут вместе
  function pairsFor(ids, limit = 3) {
    const have = new Set(ids);
    const out = [];
    for (const id of ids) {
      const d = byId[id];
      for (const p of [...(d?.pairs || []), ...((stats.pairs || {})[id] || [])]) {
        if (!have.has(p) && byId[p]?.available && !out.includes(p)) out.push(p);
      }
    }
    return out.slice(0, limit).map((id) => byId[id]);
  }
  function pairsHtml(list, title) {
    if (!list.length) return '';
    return `<h4>${esc(title)}</h4><ul class="pair-list">${list.map((d) => `<li data-open="${esc(d.id)}" role="button" tabindex="0">
      ${photo(d, 'pair-photo')}<span class="grow"><b>${esc(L(d.name))}</b><small>${money(d.price)}</small></span>
      <span class="slot" data-slot="${esc(d.id)}">${control(d.id)}</span></li>`).join('')}</ul>`;
  }

  // ---------- Активная категория при прокрутке ----------
  function setActive(id) {
    activeCat = id;
    const nav = $('#cats');
    nav.querySelectorAll('.chip').forEach((c) => {
      const on = c.dataset.cat === id;
      c.classList.toggle('active', on);
      c.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) nav.scrollTo({ left: c.offsetLeft - nav.clientWidth / 2 + c.clientWidth / 2, behavior: smooth() });
    });
  }
  function onScroll() {
    if (Date.now() < spyLockUntil) return;
    const sections = [...document.querySelectorAll('section.cat')];
    if (!sections.length) return;
    const line = $('#cats').getBoundingClientRect().bottom + 16;
    let cur = sections[0].dataset.cat;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) cur = s.dataset.cat;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && window.scrollY > 0) {
      cur = sections[sections.length - 1].dataset.cat;
    }
    if (cur !== activeCat) setActive(cur);
  }
  // как в iOS: при прокрутке вниз плашка заказа становится компактнее, вверх — обычной
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const bar = $('#order-bar');
    if (Math.abs(y - lastY) > 6) {
      bar?.classList.toggle('compact', y > lastY && y > 200);
      document.body.classList.toggle('scrolled', y > 120);
      lastY = y;
    }
  }, { passive: true });
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  // ---------- Список гостя ----------
  const lines = () => Object.entries(order).map(([key, n]) => {
    const { id, opts } = parseKey(key);
    const d = byId[id];
    const oi = optInfo(d, opts);
    return { key, id, opts, n, d, ok: orderable(d) && oi.ok, unit: oi.unit, names: oi.names };
  });
  function totals() {
    let count = 0;
    let sum = 0;
    let gone = 0;
    for (const l of lines()) {
      count += l.n;
      if (l.ok) sum += l.unit * l.n; else gone += 1;
    }
    return { count, sum, gone };
  }

  const latestOrder = () => myOrders
    .map((o) => ({ ...o, data: tracked[o.id] }))
    .find((o) => o.data && o.data.status !== 'cancelled' && Date.now() - o.at < 12 * 60 * 60 * 1000);

  function renderBar() {
    const bar = $('#order-bar');
    if (!M) { bar.hidden = true; document.body.classList.remove('has-bar'); return; }
    const { count, sum } = totals();
    const last = count ? null : latestOrder();
    bar.classList.toggle('status-bar', !!last);
    if (count) {
      bar.dataset.go = 'order';
      const tot = charges(sum).total;
      bar.innerHTML = `<span class="bar-left"><span class="count">${count}</span>${esc(t('order'))}${attention ? '<span class="warn-dot" aria-hidden="true"></span>' : ''}</span><span class="bar-sum">${money(tot)}</span>`;
      bar.setAttribute('aria-label', `${t('order')}: ${count}, ${t('total')} ${money(tot)}`);
    } else if (last) {
      bar.dataset.go = 'track:' + last.id;
      const st = guestStatus(last.data.status);
      bar.innerHTML = `<span class="bar-left">${icon('list')}<span class="bar-txt">${esc(t('orderNo')(last.no))}</span></span><span class="bar-sum st-${esc(st)}">${st === 'accepted' ? icon('check', 'sm') : ''}<span class="bar-txt">${esc(t('statuses')[st])}</span></span>`;
      bar.setAttribute('aria-label', `${t('orderNo')(last.no)}: ${t('statuses')[st]}`);
    }
    if (count > (renderBar.lastCount || 0) && !bar.hidden) { bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); }
    renderBar.lastCount = count;
    bar.hidden = !count && !last;
    document.body.classList.toggle('has-bar', !bar.hidden);
  }

  function remember(key) {
    const { id, opts } = parseKey(key);
    const d = byId[id];
    if (d) seen[key] = { price: optInfo(d, opts).unit, name: d.name };
    store.set('seen', seen);
  }

  function refreshSlots() {
    document.querySelectorAll('[data-slot]').forEach((el) => { el.innerHTML = control(el.dataset.slot); });
  }

  function change(key, delta) {
    if (delta > 0 && !orderable(byId[parseKey(key).id])) return;
    const n = Math.min(99, Math.max(0, (order[key] || 0) + delta));
    if (n) { order[key] = n; remember(key); } else { delete order[key]; delete seen[key]; store.set('seen', seen); if (dishNotes[key]) { delete dishNotes[key]; saveDishNotes(); } if (noteOpen === key) noteOpen = null; }
    priceChanges = priceChanges.filter((p) => order[p.key]);
    store.set('order', order);
    refreshSlots();
    renderBar();
    if (sheet?.type === 'order') renderSheet();
  }

  // Почему сейчас нельзя отправить заказ (пустая строка — можно)
  function orderBlocker() {
    if (!ONLINE) return t('noServer');
    if (tableState === 'none') return t('noTable');
    if (tableState === 'invalid') return t('badTable');
    if (!R().ordersEnabled) return t('ordersOff');
    if (!R().ordersWhenClosed && !SCH.status(R().schedule, R().timezone).open) return `${t('closedNoOrders')} ${statusInfo().text}.`;
    if (lines().some((l) => !l.ok)) return t('removeSold');
    return '';
  }

  function dishNoteHtml(key) {
    const v = dishNotes[key] || '';
    if (noteOpen === key) {
      return `<div class="dn-edit">
        <div class="dn-row"><input class="dn-input" data-key="${esc(key)}" maxlength="120" aria-label="${esc(t('dishNote'))}" placeholder="${esc(t('dishNotePh'))}" value="${esc(v)}">
          <button type="button" class="btn small" data-act="dn-done">${esc(t('noteDone'))}</button></div>
      </div>`;
    }
    return v
      ? `<button type="button" class="dn-show" data-act="dn-open" data-key="${esc(key)}"><span class="dn-mark" aria-hidden="true">!</span><span>${esc(v)}</span></button>`
      : `<button type="button" class="dn-add" data-act="dn-open" data-key="${esc(key)}">${icon('plus', 'sm')}${esc(t('dishNote'))}</button>`;
  }

  function orderSheetHtml() {
    const ls = lines();
    const out = [`<h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2>`];
    if (table && tableState !== 'invalid') {
      out.push(`<p class="table-line"><span>${esc(t('yourTable'))}</span><span class="table-tag">${icon('table')}${esc(t('table'))} ${esc(table)}</span></p>`);
    }
    if (!ls.length) {
      out.push(`<div class="state">${icon('list')}<p>${esc(t('orderEmpty'))}</p></div>`);
      out.push(myOrdersHtml());
      return out.join('');
    }
    const gone = ls.filter((l) => !l.ok);
    if (gone.length) out.push(`<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('unavailableNotice')(gone.map((l) => lineName(l.key)).join(', ')))}</span></p>`);
    if (priceChanges.length) {
      const txt = priceChanges.map((p) => `${lineName(p.key)} ${money(p.from)} → ${money(p.to)}`).join('; ');
      out.push(`<p class="notice" role="status">${icon('alert')}<span>${esc(t('priceNotice')(txt))}</span></p>`);
    }
    out.push(`<ul class="order-list">${ls.map(({ key, id, n, d, ok, unit, names }) => `
      <li class="${ok ? '' : 'gone'}">
        ${photo(d)}
        <span class="o-name"><b>${esc(itemName(id))}</b>${names.length ? `<em class="o-opts">${esc(names.join(', '))}</em>` : ''}<small>${ok ? `${money(unit)} × ${n}` : esc(d?.available && !catOpen(catOf(d)) ? t('notNowRow')(clock(catOf(d).from), clock(catOf(d).to)) : t('soldOutRow'))}</small></span>
        <span class="o-sum">${ok ? money(unit * n) : ''}</span>
        <div class="o-ctl">${ok ? lineControl(key) : '<span></span>'}
          <button type="button" class="o-remove" data-act="del" data-key="${esc(key)}">${icon('trash', 'sm')}${esc(t('removeItem'))}</button></div>
        ${ok && ONLINE ? `<div class="o-dn">${dishNoteHtml(key)}</div>` : ''}
      </li>`).join('')}</ul>`);
    if (ONLINE) {
      out.push(`<section class="note-field" aria-labelledby="note-l"><span id="note-l">${esc(t('noteLabel'))}</span>
        <small class="note-hint">${esc(t('noteHint'))}</small>
        <textarea id="note-input" rows="3" maxlength="300" aria-labelledby="note-l" placeholder="${esc(t('notePh'))}">${esc(note)}</textarea></section>`);
    }
    out.push(pairsHtml(pairsFor(ls.map((l) => l.id), 3), t('upsell')));
    out.push(chargesHtml(charges(totals().sum), true));
    out.push(`<button type="button" class="link-clear" data-act="clear">${icon('trash', 'sm')}${esc(t('clear'))}</button>`);

    // закреплённый низ: причина, ошибка, кнопка отправки
    const block = orderBlocker();
    const foot = [];
    if (block) foot.push(`<p class="notice ${tableState === 'invalid' || !ONLINE ? 'bad' : ''}" role="status">${icon('alert')}<span>${esc(block)}</span></p>`);
    else if (tableState === 'checking') foot.push(`<p class="notice info" role="status">${icon('refresh')}<span>${esc(t('checkingTable'))}</span></p>`);
    if (sendError) foot.push(`<p class="notice bad" role="alert">${icon('alert')}<span>${esc(sendError)}</span></p>`);
    if (ONLINE) {
      foot.push(`<button type="button" class="btn block send-btn" data-act="send"${block || sending ? ' disabled' : ''}>
        ${sending ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('sending'))}</span>` : `<span>${esc(t('sendOrder'))}</span><span class="send-sum"><bdi dir="ltr">${money(charges(totals().sum).total)}</bdi></span>`}</button>`);
    }
    out.push(`<div class="sheet-actions">${foot.join('')}</div>`);
    out.push(myOrdersHtml());
    return out.join('');
  }

  function myOrdersHtml() {
    const list = myOrders.filter((o) => tracked[o.id]).slice(0, 5);
    if (!list.length) return '';
    return `<h4>${esc(t('myOrders'))}</h4><ul class="my-orders">${list.map((o) => {
      const st = guestStatus(tracked[o.id].status);
      return `<li><button type="button" class="my-order" data-act="track" data-id="${esc(o.id)}">
        <span><b>${esc(t('orderNo')(o.no))}</b><small>${esc(t('sentAt')(timeOf(tracked[o.id].created_at)))}</small></span>
        <span class="st st-${esc(st)}">${st === 'accepted' ? icon('check', 'sm') : ''}${esc(t('statuses')[st])}</span>${icon('chevron', 'chev')}</button></li>`;
    }).join('')}</ul>`;
  }

  const timeOf = (iso) => new Intl.DateTimeFormat(t('locale'), { hour: '2-digit', minute: '2-digit', hour12: lang === 'en' }).format(new Date(iso));
  // гость видит три состояния: отправлен → принят официантом (кухонные этапы тоже считаются принятым) / отменён
  // гость видит путь заказа: отправлен → принят → готовится → готово (несут) → подано / отменён
  // в ресторане всё просто: заказ отправлен → подан (или отменён). Без «принят / готовится / готово».
  const guestStatus = (s) => (['served', 'cancelled'].includes(s) ? s : 'new');

  const shownStatus = {};   // что гость уже видел — новый статус «подпрыгивает»
  let renderedTrack = null; // какую шторку заказа уже показали — появление играет один раз
  const STATUS_ICON = { new: 'clock', accepted: 'check', served: 'check', cancelled: 'x' };
  // фаза бесконечной анимации привязана к часам: перерисовка не сбивает пульс
  const phase = (ms) => `--ph:-${Date.now() % ms}ms`;
  function trackSheetHtml(id) {
    const o = tracked[id];
    const mine = myOrders.find((x) => x.id === id);
    if (!o || !mine) return `<div class="state">${icon('alert')}<p>${esc(t('errServer'))}</p></div>`;
    const gs = guestStatus(o.status);
    const enter = renderedTrack !== id;
    renderedTrack = id;
    const before = enter ? null : shownStatus[id];
    const changed = before && before !== gs;
    setTimeout(() => { if (tracked[id]) shownStatus[id] = guestStatus(tracked[id].status); }, 0);
    const sentNow = justSent === id && gs === 'new';
    const ic = sentNow ? 'check' : STATUS_ICON[gs];
    const kind = gs === 'new' || gs === 'cancelled' ? gs : 'ok';
    return `<div class="track${enter ? ' enter' : ''}">
      <h2 class="sheet-title tr-a" id="sheet-title" style="--i:0">${esc(t('orderNo')(o.no))}</h2>
      <p class="track-meta tr-a" style="--i:1"><span class="table-tag">${icon('table')}${esc(t('table'))} ${esc(o.table_label)}</span><span class="tm-time">${icon('clock', 'sm')}${esc(timeOf(o.created_at))}</span>${o.paid_at ? `<span class="badge ok paid-tag">${icon('check', 'sm')}${esc(t('paid'))}</span>` : ''}</p>
      <div class="track-card tr-a is-${kind}${changed ? ' pop' : ''}${sentNow && enter ? ' sent' : ''}" style="--i:2" aria-live="polite">
        <span class="track-icon" style="${phase(2000)}">${icon(ic)}</span>
        <div><b>${esc(t('statuses')[gs])}</b><span>${esc(t('statusHint')[gs])}</span></div>
      </div>
      ${trackStale ? `<p class="notice info">${icon('alert')}<span>${esc(t('statusStale'))}</span></p>` : ''}
      ${o.edited_at ? `<p class="notice info">${icon('refresh')}<span>${esc(t('edited')(timeOf(o.edited_at)))}</span></p>` : ''}
      <ul class="order-list track-list tr-a" style="--i:4">${(o.items || []).map((i) => {
        const on = (i.opts || []).map((x) => L(x.name)).filter(Boolean);
        return `
        <li><span class="o-name"><b>${esc(L(i.name) || i.id)}</b>${on.length ? `<em class="o-opts">${esc(on.join(', '))}</em>` : ''}${i.note ? `<span class="dn-show static"><span class="dn-mark" aria-hidden="true">!</span><span>${esc(i.note)}</span></span>` : ''}<small>${money(i.price)} × ${i.qty}</small></span><span class="o-sum">${money(i.price * i.qty)}</span></li>`;
      }).join('')}</ul>
      ${o.note ? `<p class="notice info">${icon('list')}<span><b>${esc(t('note'))}:</b> ${esc(o.note)}</span></p>` : ''}
      ${chargesHtml({ sub: o.subtotal ?? o.total, service: o.service || 0, tax: o.tax || 0, total: o.total }, false)}
      ${reviewHtml(id, o)}
      <div class="track-actions tr-a" style="--i:5">
        ${gs !== 'cancelled' ? `<button type="button" class="btn soft" data-act="repeat" data-id="${esc(id)}">${icon('refresh', 'sm')}<span>${esc(t('repeat'))}</span></button>` : ''}
        <button type="button" class="btn ghost" data-act="more"><span>${esc(t('orderMore'))}</span></button>
      </div></div>`;
  }

  // ---------- Отзыв и «Повторить заказ» ----------
  let reviewed = store.get('reviewed', {}) || {};
  let reviewDraft = { rating: 0, text: '' };
  let reviewBusy = false;
  function reviewHtml(id, o) {
    if (!ONLINE || (!['served', 'ready', 'cooking'].includes(o.status) && !o.paid_at)) return '';
    if (reviewed[id]) return `<p class="notice ok">${icon('check')}<span>${esc(t('rateThanks'))}</span></p>`;
    const r = reviewDraft.rating;
    return `<section class="review" aria-labelledby="rv-t"><h4 id="rv-t">${esc(t('rateTitle'))}</h4>
      <div class="stars" role="radiogroup" aria-label="${esc(t('rateTitle'))}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star${n <= r ? ' on' : ''}" data-act="rate" data-n="${n}" role="radio" aria-checked="${n === r}" aria-label="${esc(t('rateStar')(n))}"><svg class="ic" aria-hidden="true"><use href="#i-star"/></svg></button>`).join('')}</div>
      ${r ? `<textarea id="review-text" rows="2" maxlength="500" placeholder="${esc(t('ratePh'))}">${esc(reviewDraft.text)}</textarea>
        <button type="button" class="btn block" data-act="review-send" data-id="${esc(id)}"${reviewBusy ? ' disabled' : ''}>${esc(t('rateSend'))}</button>` : ''}
    </section>`;
  }
  async function sendReview(id) {
    const mine = myOrders.find((x) => x.id === id);
    if (!mine || !reviewDraft.rating || reviewBusy) return;
    reviewBusy = true;
    renderSheet();
    try {
      await rpc('leave_review', { p_order: id, p_token: mine.token, p_rating: reviewDraft.rating, p_comment: reviewDraft.text.trim() || null, p_lang: lang });
      reviewed[id] = reviewDraft.rating;
      store.set('reviewed', reviewed);
      reviewDraft = { rating: 0, text: '' };
      toast(t('rateThanks'), 'good');
    } catch { toast(t('errServer'), 'bad'); }
    reviewBusy = false;
    renderSheet();
  }
  document.addEventListener('input', (e) => { if (e.target.id === 'review-text') reviewDraft.text = e.target.value; });
  function repeatOrder(id) {
    const o = tracked[id];
    if (!o) return;
    let added = 0;
    let skipped = 0;
    for (const i of o.items || []) {
      const d = byId[i.id];
      const opts = (i.opts || []).map((x) => `${x.g}:${x.c}`);
      if (!orderable(d) || !optInfo(d, opts).ok) { skipped += 1; continue; }
      const key = makeKey(d.id, opts);
      order[key] = Math.min(99, (order[key] || 0) + Number(i.qty));
      remember(key);
      if (i.note && !dishNotes[key]) dishNotes[key] = String(i.note).slice(0, 120);
      added += Number(i.qty);
    }
    saveDishNotes();
    store.set('order', order);
    refreshSlots();
    renderBar();
    if (added) { openSheet({ type: 'order' }); toast(skipped ? t('repeatSome') : t('repeatDone')(added), skipped ? '' : 'good'); }
    else toast(t('repeatSome'), 'bad');
  }

  // ---------- Выбор вариантов блюда ----------
  const pickedOpts = () => [...document.querySelectorAll('#sheet-body input[data-g]:checked')].map((i) => `${i.dataset.g}:${i.value}`);
  function updatePick() {
    const d = byId[sheet?.id];
    if (!d || !sheet.pick) return;
    sheet.pick.sel = pickedOpts();
    const oi = optInfo(d, sheet.pick.sel);
    const q = $('#pick-qty');
    if (q) q.textContent = sheet.pick.qty;
    const b = $('#pick-add');
    if (b) { b.disabled = !oi.ok; b.innerHTML = `<span>${esc(t('addFor')(money(oi.unit * sheet.pick.qty)))}</span>`; }
  }
  function addPicked() {
    const d = byId[sheet?.id];
    if (!d || !sheet.pick || !orderable(d)) return;
    const opts = pickedOpts();
    if (!optInfo(d, opts).ok) { updatePick(); return; }
    const key = makeKey(d.id, opts);
    order[key] = Math.min(99, (order[key] || 0) + sheet.pick.qty);
    remember(key);
    store.set('order', order);
    refreshSlots();
    renderBar();
    closeSheet();
  }
  document.addEventListener('change', (e) => {
    const inp = e.target.closest?.('#sheet-body input[data-g]');
    if (!inp) return;
    // одиночная группа (необязательная): галочка ведёт себя как переключатель
    if (inp.type === 'checkbox' && inp.dataset.single && inp.checked) {
      document.querySelectorAll(`#sheet-body input[data-g="${CSS.escape(inp.dataset.g)}"]`).forEach((x) => { if (x !== inp) x.checked = false; });
    }
    updatePick();
  });

  // ---------- Позвать официанта / попросить счёт ----------
  let openCalls = { waiter: false, bill: false, reasons: [] };
  let calling = false;
  let callsTimer = null;
  function renderTableActions() {
    const el = $('#table-actions');
    if (!el) return;
    const show = ONLINE && !!tableToken && tableState !== 'invalid' && tableState !== 'none';
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    el.innerHTML = `<button type="button" class="call-btn${openCalls.waiter ? ' on' : ''}" data-act="call-waiter"${calling ? ' disabled' : ''}>${icon(openCalls.waiter ? 'check' : 'bell')}<span>${esc(openCalls.waiter ? t('waiterComing') : t('callWaiter'))}</span></button>
      <button type="button" class="call-btn${openCalls.bill ? ' on' : ''}" data-act="call-bill"${calling ? ' disabled' : ''}>${icon(openCalls.bill ? 'check' : 'list')}<span>${esc(openCalls.bill ? t('billComing') : t('askBill'))}</span></button>`;
  }
  async function callStaff(kind, method, reason) {
    if (calling || !ONLINE || !tableToken) return;
    calling = true;
    renderTableActions();
    try {
      await rpc('call_staff', { p_table: tableToken, p_kind: kind, p_method: method || null, p_reason: reason || null });
      openCalls[kind] = true;
      if (reason && !openCalls.reasons.includes(reason)) openCalls.reasons.push(reason);
      if (sheet?.type === 'bill' || sheet?.type === 'waiter') closeSheet();
      toast(t(kind === 'bill' ? 'billSent' : 'callSent'), 'good');
      scheduleCalls();
    } catch (e) {
      const m = String(e?.message || '');
      if (/bad_table/.test(m)) { tableState = 'invalid'; table = ''; store.set('table', null); renderHeader(); renderMenu(); }
      toast(/too_many/.test(m) ? t('errTooMany') : t('callErr'), 'bad');
    } finally {
      calling = false;
      renderTableActions();
    }
  }
  async function pollCalls() {
    if (!ONLINE || !tableToken || tableState === 'invalid') return;
    try {
      const rows = await rpc('table_calls', { p_table: tableToken });
      const list = Array.isArray(rows) ? rows : [];
      openCalls = { waiter: list.some((c) => c.kind === 'waiter'), bill: list.some((c) => c.kind === 'bill'), reasons: list.map((c) => c.reason).filter(Boolean) };
      renderTableActions();
    } catch { /* нет связи — оставляем как было */ }
  }
  function scheduleCalls() {
    clearTimeout(callsTimer);
    if (!openCalls.waiter && !openCalls.bill) return;
    callsTimer = setTimeout(async () => { if (!document.hidden) await pollCalls(); scheduleCalls(); }, 15000);
  }

  async function openBill() {
    openSheet({ type: 'bill', tableBill: undefined });
    try {
      const rows = await rpc('table_bill', { p_table: tableToken });
      if (sheet?.type === 'bill') { sheet.tableBill = Array.isArray(rows) ? rows : []; renderSheet(); }
    } catch { if (sheet?.type === 'bill') { sheet.tableBill = null; renderSheet(); } }
  }
  function renderFilterBtn() {
    const b = $('#filter-btn');
    if (!b) return;
    const n = filterCount();
    b.classList.toggle('on', !!n);
    b.innerHTML = `${icon('filter')}${n ? `<span class="f-n">${n}</span>` : ''}`;
    b.setAttribute('aria-label', `${t('filter')}${n ? ` (${n})` : ''}`);
  }

  // ---------- Фото блюда на весь экран ----------
  let viewer = null;   // { ids, i }
  function openViewer(id) {
    const d = byId[id];
    if (!d?.photo) return;
    const ids = M.dishes.filter((x) => x.photo && x.category === d.category).map((x) => x.id);
    viewer = { ids, i: Math.max(0, ids.indexOf(id)) };
    paintViewer();
  }
  function paintViewer() {
    let el = $('#viewer');
    if (!viewer) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'viewer';
      el.className = 'viewer';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
      let x0 = null;
      el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) stepViewer((dx < 0) === (t('dir') !== 'rtl') ? 1 : -1);
      });
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-v="prev"]')) stepViewer(-1);
        else if (e.target.closest('[data-v="next"]')) stepViewer(1);
        else if (!e.target.closest('img')) closeViewer();
      });
    }
    const d = byId[viewer.ids[viewer.i]];
    const many = viewer.ids.length > 1;
    el.innerHTML = `<button type="button" class="v-close" aria-label="${esc(t('close'))}" data-v="close">${icon('x')}</button>
      <figure class="v-in"><img src="${esc(d.photo)}" alt="${esc(L(d.name))}"><figcaption><b>${esc(L(d.name))}</b><span>${money(d.price)}</span>${many ? `<small>${esc(t('photoOf')(viewer.i + 1, viewer.ids.length))}</small>` : ''}</figcaption></figure>
      ${many ? `<button type="button" class="v-nav v-prev" data-v="prev" aria-label="‹">${icon('chevron')}</button><button type="button" class="v-nav v-next" data-v="next" aria-label="›">${icon('chevron')}</button>` : ''}`;
    el.querySelector('.v-close').focus({ preventScroll: true });
  }
  function stepViewer(dir) { if (!viewer) return; viewer.i = (viewer.i + dir + viewer.ids.length) % viewer.ids.length; paintViewer(); }
  function closeViewer() { viewer = null; paintViewer(); }
  document.addEventListener('keydown', (e) => {
    if (!viewer) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeViewer(); }
    else if (e.key === 'ArrowRight') stepViewer(t('dir') === 'rtl' ? -1 : 1);
    else if (e.key === 'ArrowLeft') stepViewer(t('dir') === 'rtl' ? 1 : -1);
  }, true);

  // ---------- Отправка заказа ----------
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  const cartSig = () => JSON.stringify([tableToken, note.trim(), lines().map((l) => [l.key, l.n, l.unit]).sort()]);

  async function sendOrder() {
    if (sending || !lines().length || orderBlocker()) { renderSheet(); return; }
    sending = true;
    sendError = '';
    renderSheet();
    try {
      // 1) свежие цены и наличие: если что-то изменилось — показываем гостю и НЕ отправляем
      const before = JSON.stringify(lines().map((l) => [l.key, l.ok, l.unit]));
      const fresh = await refreshMenu(true);
      if (!fresh) throw Object.assign(new Error('network'), { net: true });
      if (JSON.stringify(lines().map((l) => [l.key, l.ok, l.unit])) !== before) { sendError = t('errChanged'); return; }
      if (orderBlocker()) return;
      // 2) один ключ на одну попытку: повторное нажатие и плохой интернет не создадут второй заказ
      const sig = cartSig();
      if (!pendingKey || pendingKey.sig !== sig) {
        pendingKey = { key: uuid(), sig };
        store.set('pendingKey', pendingKey);
      }
      const rows = await rpc('place_order', {
        p_table: tableToken,
        p_items: lines().map((l) => ({ id: l.id, qty: l.n, price: l.unit, ...(l.opts.length ? { opts: l.opts } : {}), ...(dishNotes[l.key]?.trim() ? { note: dishNotes[l.key].trim().slice(0, 120) } : {}) })),
        p_note: note.trim() || null,
        p_lang: lang,
        p_client_key: pendingKey.key,
      });
      const o = Array.isArray(rows) ? rows[0] : rows;
      if (!o?.id || !o.guest_token) throw new Error('bad_reply');
      // 3) сервер подтвердил — только теперь говорим «отправлен»
      myOrders = [{ id: o.id, token: o.guest_token, no: o.no, at: Date.now() }, ...myOrders.filter((x) => x.id !== o.id)].slice(0, 10);
      tracked[o.id] = { ...o, updated_at: o.created_at };
      store.set('myOrders', myOrders);
      store.set('tracked', tracked);
      order = {};
      seen = {};
      note = '';
      priceChanges = [];
      pendingKey = null;
      dishNotes = {};
      noteOpen = null;
      saveDishNotes();
      ['order', 'seen', 'note', 'pendingKey'].forEach((k) => store.set(k, k === 'order' || k === 'seen' ? {} : k === 'note' ? '' : null));
      refreshSlots();
      justSent = o.id;
      sheet = { type: 'track', id: o.id };
      schedulePoll(true);
    } catch (e) {
      const m = String(e?.message || '');
      if (e?.net) sendError = t('errNetwork');
      else if (/price_changed|unavailable|options|not_now/.test(m)) { await refreshMenu(true); sendError = t('errChanged'); }
      else if (/bad_table/.test(m)) { tableState = 'invalid'; table = ''; store.set('table', null); sendError = ''; }
      else if (/closed|orders_off/.test(m)) { await refreshMenu(true); sendError = ''; }
      else if (/too_many/.test(m)) sendError = t('errTooMany');
      else sendError = t('errServer');
    } finally {
      sending = false;
      renderHeader();
      renderBar();
      renderSheet();
    }
  }

  // ---------- Статус своих заказов ----------
  let pollTimer = null;
  async function pollOrders() {
    if (!ONLINE) return;
    const recent = myOrders.filter((o) => Date.now() - o.at < 24 * 60 * 60 * 1000).slice(0, 5);
    if (!recent.length) return;
    let ok = true;
    let changed = false;
    const gone = [];
    await Promise.all(recent.map(async (o) => {
      try {
        const rows = await rpc('get_order', { p_id: o.id, p_token: o.token });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) { gone.push(o.id); return; }  // сервер не знает такой заказ (старше 3 дней или другая база)
        if (JSON.stringify(tracked[o.id]) !== JSON.stringify(row)) {
          tracked[o.id] = row;
          changed = true;
        }
      } catch { ok = false; }
    }));
    if (gone.length) {
      myOrders = myOrders.filter((o) => !gone.includes(o.id));
      gone.forEach((id) => delete tracked[id]);
      store.set('myOrders', myOrders);
      changed = true;
      if (sheet?.type === 'track' && gone.includes(sheet.id)) closeSheet();
    }
    if (trackStale === ok) changed = true;
    trackStale = !ok;
    if (changed) {
      store.set('tracked', tracked);
      renderBar();
      if (sheet?.type === 'track' || sheet?.type === 'order') renderSheet();
    }
  }
  function schedulePoll(soon) {
    clearTimeout(pollTimer);
    if (!ONLINE || !myOrders.length) return;
    const active = myOrders.some((o) => ['new', 'accepted', 'cooking', 'ready'].includes(tracked[o.id]?.status) && !tracked[o.id]?.paid_at);
    pollTimer = setTimeout(async () => {
      if (!document.hidden) await pollOrders();
      schedulePoll();
    }, soon ? 3000 : active ? 10000 : 60000);
  }

  async function checkTable() {
    if (!ONLINE || !tableToken) { if (!tableToken && tableState !== 'invalid') tableState = 'none'; return; }
    try {
      const rows = await rpc('table_info', { p_token: tableToken });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row?.label) {
        table = row.label;
        tableState = 'ok';
        store.set('table', { token: tableToken, at: Date.now(), label: table });
        pollCalls().then(scheduleCalls);
      } else {
        table = '';
        tableState = 'invalid';
        store.set('table', null);
      }
    } catch {
      tableState = 'unknown'; // нет связи: проверит сервер при отправке
    }
    renderHeader();
    renderTableActions();
    renderMenu();
    if (sheet?.type === 'order') renderSheet();
  }

  // ---------- Шторка ----------
  function renderSheet() {
    if (!sheet || !M) return;
    const body = $('#sheet-body');

    if (sheet.type === 'lang') {
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('language'))}</h2>
        <ul class="lang-list">${LANGS.map((l) => `<li><button type="button" class="lang-opt${l === lang ? ' on' : ''}" data-lang="${esc(l)}" dir="ltr" aria-pressed="${l === lang}">
          <span lang="${esc(l)}">${esc(T[l].langName)}</span><span class="lang-code">${l === lang ? icon('check') : esc(l.toUpperCase())}</span></button></li>`).join('')}</ul>`;
      return;
    }

    if (sheet.type === 'halal') {
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('halal'))}</h2><p class="sheet-desc">${esc(L(R().halalNote))}</p>`;
      return;
    }

    if (sheet.type === 'hours') {
      const s = R().schedule;
      const today = SCH.localNow(R().timezone, new Date()).day;
      const st = statusInfo();
      const city = String(R().timezone || '').split('/').pop().replace(/_/g, ' ');
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('hours'))}</h2>
        <span class="badge ${st.open ? 'ok' : 'off'}"><span class="dot"></span>${esc(st.text)}</span>
        <ul class="hours-list">${s.map((d, i) => `<li class="${i === today ? 'today' : ''}">
          <span>${esc(t('days')[i])}${i === today ? ` · ${esc(t('today'))}` : ''}</span>
          ${d.closed ? `<span class="off">${esc(t('dayOff'))}</span>` : `<bdi dir="ltr">${esc(clock(d.open))}–${esc(clock(d.close))}</bdi>`}</li>`).join('')}</ul>
        ${city ? `<p class="hint-small" style="margin-top:12px;color:var(--muted);font-size:13px">${esc(t('tzNote')(city))}</p>` : ''}`;
      return;
    }

    if (sheet.type === 'dish') {
      const d = byId[sheet.id];
      if (!d) { closeSheet(); return; }
      const meta = [amount(d), d.kcal ? `${d.kcal} ${t('kcal')}` : '', d.prepMin ? t('prep')(d.prepMin) : ''].filter(Boolean).join(' · ');
      const allergens = (d.allergens || []).map((a) => t('allergenNames')[a] || a).join(', ');
      const pick = hasOptions(d) && orderable(d);
      if (pick && !sheet.pick) {
        // обязательный одиночный выбор: сразу отмечаем первый вариант (например, «целая порция»)
        const sel = [];
        for (const g of d.options) if (g.required && !g.multi && g.choices?.length) sel.push(`${g.id}:${g.choices[0].id}`);
        sheet.pick = { qty: 1, sel };
      }
      const oi = pick ? optInfo(d, sheet.pick.sel) : null;
      const optsHtml = pick ? `<div class="opt-groups">${d.options.map((g) => `
          <fieldset class="opt-group" data-group="${esc(g.id)}"><legend><b>${esc(L(g.name))}</b><small>${esc(g.required ? t('required') : t('optional'))}</small></legend>
          ${(g.choices || []).map((c) => {
            const pr = Number(c.price) || 0;
            const on = sheet.pick.sel.includes(`${g.id}:${c.id}`);
            return `<label class="opt"><input type="${g.required && !g.multi ? 'radio' : 'checkbox'}" name="opt-${esc(g.id)}" value="${esc(c.id)}" data-g="${esc(g.id)}"${g.multi ? '' : ' data-single="1"'}${on ? ' checked' : ''}>
              <span class="opt-name">${esc(L(c.name))}</span>${pr ? `<span class="opt-price"><bdi dir="ltr">${pr > 0 ? '+' : '−'}${money(Math.abs(pr))}</bdi></span>` : ''}</label>`;
          }).join('')}</fieldset>`).join('')}</div>` : '';
      body.innerHTML = `
        ${photo(d, 'big', true)}
        ${tagsHtml(d)}
        <h2 class="sheet-title" id="sheet-title">${esc(L(d.name))}</h2>
        ${L(d.desc) ? `<p class="sheet-desc">${esc(L(d.desc))}</p>` : ''}
        ${d.available ? '' : `<p class="notice bad">${icon('alert')}<span>${esc(t('soldOut'))}</span></p>`}
        ${meatText(d) ? `<h4>${esc(t('meatLabel'))}</h4><p class="meat-line">${esc(meatText(d))}</p>` : ''}
        ${L(d.ingredients) ? `<h4>${esc(t('ingredients'))}</h4><p>${esc(L(d.ingredients))}</p>` : ''}
        ${allergens ? `<h4>${esc(t('allergens'))}</h4><p>${esc(allergens)}</p>` : ''}
        ${pick ? `<p class="pick-price"><span class="price big">${money(d.price)}</span><span class="amount">${esc(meta)}</span></p>${optsHtml}
        <div class="sheet-foot pick-foot">
          <div class="stepper"><button type="button" data-act="pick-dec" aria-label="${esc(t('remove'))}">${icon('minus')}</button><span id="pick-qty" aria-live="polite">${sheet.pick.qty}</span><button type="button" data-act="pick-inc" aria-label="${esc(t('add'))}">${icon('plus')}</button></div>
          <button type="button" class="btn pick-add" id="pick-add" data-act="pick-add"${oi.ok ? '' : ' disabled'}><span>${esc(t('addFor')(money(oi.unit * sheet.pick.qty)))}</span></button>
        </div>` : `
        <div class="sheet-foot">
          <div class="price-wrap"><span class="price big">${money(d.price)}</span><span class="amount">${esc(meta)}</span></div>
          <div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div>
        </div>`}
        ${pairsHtml(pairsFor([d.id]), t('pairs'))}`;
      if (d.photo) body.querySelector('.photo.big')?.setAttribute('data-zoom', d.id);
      return;
    }

    if (sheet.type === 'waiter') {
      const pend = openCalls.reasons || [];
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('reqTitle'))}</h2>
        <div class="req-grid">
          <button type="button" class="req-opt req-come" data-act="req" data-reason="">${icon('bell')}<span>${esc(t('reqCome'))}</span>${openCalls.waiter && !pend.length ? `<small>${esc(t('reqPending'))}</small>` : ''}</button>
          ${Object.entries(t('reqs')).map(([k, n]) => `<button type="button" class="req-opt${pend.includes(k) ? ' on' : ''}" data-act="req" data-reason="${k}"><span>${esc(n)}</span>${pend.includes(k) ? `<small>${esc(t('reqPending'))}</small>` : ''}</button>`).join('')}
        </div>`;
      return;
    }

    if (sheet.type === 'filters') {
      const n = M.dishes.filter(passFilters).length;
      const all = Object.keys(t('allergenNames'));
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('filter'))}</h2>
        <div class="f-chips">
          <button type="button" class="f-chip${filters.veg ? ' on' : ''}" data-act="f" data-f="veg" aria-pressed="${!!filters.veg}">${esc(t('fVeg'))}</button>
          <button type="button" class="f-chip${filters.spicy ? ' on' : ''}" data-act="f" data-f="spicy" aria-pressed="${!!filters.spicy}">${esc(t('fSpicy'))}</button>
        </div>
        <h4>${esc(t('allergens'))}</h4>
        <div class="f-chips">${all.map((a) => { const on = (filters.no || []).includes(a); return `<button type="button" class="f-chip${on ? ' on' : ''}" data-act="f" data-f="no:${a}" aria-pressed="${on}">${esc(t('fNo'))} ${esc(t('allergenNames')[a])}</button>`; }).join('')}</div>
        <p class="hint-note">${esc(t('fNote'))}</p>
        <div class="sheet-actions"><div class="btn-pair">
          <button type="button" class="btn ghost" data-act="f-reset"${filterCount() ? '' : ' disabled'}>${esc(t('fReset'))}</button>
          <button type="button" class="btn" data-act="f-done">${esc(t('fShow')(n))}</button></div></div>`;
      return;
    }

    if (sheet.type === 'bill') {
      const tb = sheet.tableBill;
      const tot = (tb || []).reduce((x, o) => x + Number(o.total), 0);
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('askBill'))}</h2>
        ${tb === undefined ? `<p class="sheet-desc">…</p>` : tb === null ? '' : tb.length ? `
          <h4>${esc(t('tableBill'))}</h4><p class="hint-note" style="margin-top:2px">${esc(t('tableBillHint'))}</p>
          <ul class="order-list track-list">${tb.map((o) => `<li><span class="o-name"><b>${esc(t('orderNo')(o.no))}</b><small>${esc((o.items || []).map((i) => `${i.qty}× ${L(i.name) || i.id}`).join(', '))}</small></span><span class="o-sum">${money(o.total)}</span></li>`).join('')}</ul>
          <div class="order-total"><span>${esc(t('tableTotal'))}</span><strong>${money(tot)}</strong></div>` : `<p class="hint-note">${esc(t('tableBillEmpty'))}</p>`}
        <p class="sheet-desc">${esc(t('payHow'))}</p>
        <div class="pay-list">${[['cash', t('payCash')], ['card', t('payCard')], ['qr', t('payQr')]].map(([m, n]) => `
          <button type="button" class="pay-opt" data-act="pay" data-method="${m}"><span>${esc(n)}</span>${icon('chevron', 'chev')}</button>`).join('')}</div>`;
      return;
    }

    if (sheet.type === 'track') { body.innerHTML = trackSheetHtml(sheet.id); return; }
    body.innerHTML = orderSheetHtml();
  }

  function openSheet(next) {
    const wasOpen = !!sheet;
    sheet = next;
    if (next.type === 'order') {
      attention = false;
      renderBar();
      $('#toast').classList.remove('show'); // то же самое уже написано в списке
    }
    renderSheet();
    const el = $('#sheet');
    el.scrollTop = 0;
    if (wasOpen) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    $('#backdrop').hidden = false;
    document.body.classList.add('locked');
    void el.offsetHeight; // зафиксировать начальное положение, чтобы анимация сработала
    el.classList.add('open');
    $('#backdrop').classList.add('open');
    el.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!sheet) return;
    if (sheet.type === 'order') priceChanges = [];
    if (sheet.type === 'track') { justSent = null; renderedTrack = null; }
    sheet = null;
    const el = $('#sheet');
    const bd = $('#backdrop');
    el.classList.remove('open');
    bd.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { if (!sheet) { el.hidden = true; bd.hidden = true; } }, 300);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // смахнуть шторку вниз — закрыть (на телефоне): тянем за верх или когда список уже вверху
  {
    const el = $('#sheet');
    let y0 = null; let dy = 0; let t0 = 0; let dragging = false;
    const phone = () => matchMedia('(max-width: 719.98px)').matches;
    el.addEventListener('touchstart', (e) => {
      if (!sheet || !phone() || e.touches.length !== 1) return;
      const onGrab = e.target.closest('.sheet-grab') || e.touches[0].clientY - el.getBoundingClientRect().top < 56;
      if (!onGrab && el.scrollTop > 0) return;
      if (e.target.closest('input, textarea, select, .hits-row, .stepper')) return;
      y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); dragging = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 8 && el.scrollTop <= 0) { dragging = true; el.classList.add('dragging'); }
      if (!dragging) { if (dy < 0) y0 = null; return; }
      e.preventDefault();
      el.style.transform = `translateY(${Math.max(0, dy)}px)`;
      $('#backdrop').style.opacity = String(Math.max(0, 1 - dy / 400));
    }, { passive: false });
    const end = () => {
      if (y0 == null) return;
      const fast = dy > 60 && Date.now() - t0 < 250;
      el.classList.remove('dragging');
      el.style.transform = '';
      $('#backdrop').style.opacity = '';
      if (dragging && (dy > 120 || fast)) closeSheet();
      y0 = null; dragging = false; dy = 0;
    };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  }

  let toastTimer = null;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${kind} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = `toast ${kind}`; }, 4200);
  }

  // ---------- Загрузка меню из базы ----------
  async function rest(path) {
    const headers = { apikey: B.key };
    if (String(B.key).startsWith('eyJ')) headers.Authorization = 'Bearer ' + B.key; // старый формат ключа
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000); // медленная сеть: не ждём вечно
    try {
      const res = await fetch(`${String(B.url).replace(/\/+$/, '')}/rest/v1/${path}`, { headers, signal: ctl.signal });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function rpc(name, body) {
    const headers = { 'Content-Type': 'application/json', apikey: B.key };
    if (String(B.key).startsWith('eyJ')) headers.Authorization = 'Bearer ' + B.key;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    let res;
    try {
      res = await fetch(`${String(B.url).replace(/\/+$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
    } catch {
      throw Object.assign(new Error('network'), { net: true });
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(String(data?.message || `http_${res.status}`));
    return data;
  }

  let loading = null;
  function refreshMenu(force) {
    if (!ONLINE) return Promise.resolve(false);
    if (loading && !force) return loading;
    loading = (async () => {
      try {
        const [st, cats, dishes] = await Promise.all([
          rest('settings?select=*&id=eq.1'),
          rest('categories?select=*'),
          rest('dishes?select=*'),
        ]);
        if (!st[0]) throw new Error('no_settings');
        stale = false;
        applyMenu(fromDb(st[0], cats, dishes));
        return true;
      } catch {
        if (M) { if (!stale) { stale = true; renderMenu(); } } else { state = 'error'; renderAll(); }
        return false;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  // Новое меню: сравниваем со списком гостя — что пропало, что подорожало.
  function applyMenu(next) {
    const first = !M;
    const goneBefore = new Set(lines().filter((l) => !l.ok).map((l) => l.key));
    const sameMenu = JSON.stringify(M) === JSON.stringify(next);
    M = next;
    state = 'ready';
    index();
    store.set('cache', M);

    let changed = false;
    for (const { key, d, ok, unit } of lines()) {
      if (!ok && !goneBefore.has(key)) changed = true;
      if (ok && seen[key] && Number(seen[key].price) !== unit) {
        priceChanges = priceChanges.filter((p) => p.key !== key).concat({ key, from: Number(seen[key].price), to: unit });
        changed = true;
      }
      if (d && ok) seen[key] = { price: unit, name: d.name };
    }
    store.set('seen', seen);
    if (changed && !first) {
      attention = sheet?.type !== 'order';
      toast(t('listUpdated'));
    }
    if (!sameMenu || changed || first) renderAll();
  }

  // ---------- Тема ----------
  const media = matchMedia('(prefers-color-scheme: dark)');
  let theme = store.get('theme', null);
  function applyTheme() {
    const th = theme || (media.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = th;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#1B1611' : '#FAF5EC');
    renderHeader();
  }
  media.addEventListener?.('change', applyTheme);

  // ---------- События ----------
  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      const k = act.dataset.key || act.dataset.id;
      if (a === 'inc') change(k, 1);
      else if (a === 'dec') change(k, -1);
      else if (a === 'del') change(k, -(order[k] || 0));
      else if (a === 'pick') openSheet({ type: 'dish', id: act.dataset.id });
      else if (a === 'pick-inc' || a === 'pick-dec') { if (sheet?.pick) { sheet.pick.qty = Math.min(99, Math.max(1, sheet.pick.qty + (a === 'pick-inc' ? 1 : -1))); updatePick(); } }
      else if (a === 'pick-add') addPicked();
      else if (a === 'call-waiter') openSheet({ type: 'waiter' });
      else if (a === 'req') callStaff('waiter', null, act.dataset.reason || null);
      else if (a === 'call-bill') openBill();
      else if (a === 'filters') openSheet({ type: 'filters' });
      else if (a === 'f') {
        const f = act.dataset.f;
        if (f === 'veg' || f === 'spicy') filters[f] = !filters[f];
        else { const al = f.slice(3); filters.no = (filters.no || []).includes(al) ? filters.no.filter((x) => x !== al) : [...(filters.no || []), al]; }
        saveFilters(); renderSheet(); renderMenu(); renderFilterBtn();
      } else if (a === 'f-reset') { filters = {}; saveFilters(); renderSheet(); renderMenu(); renderFilterBtn(); }
      else if (a === 'f-done') closeSheet();
      else if (a === 'rate') { reviewDraft.rating = Number(act.dataset.n); renderSheet(); }
      else if (a === 'review-send') sendReview(act.dataset.id);
      else if (a === 'repeat') repeatOrder(act.dataset.id);
      else if (a === 'pay') callStaff('bill', act.dataset.method);
      else if (a === 'dn-open') { noteOpen = k; renderSheet(); requestAnimationFrame(() => document.querySelector('.dn-input')?.focus({ preventScroll: true })); }
      else if (a === 'dn-done') { noteOpen = null; renderSheet(); }
      else if (a === 'clear') {
        order = {};
        seen = {};
        dishNotes = {};
        noteOpen = null;
        saveDishNotes();
        priceChanges = [];
        store.set('order', order);
        store.set('seen', seen);
        refreshSlots();
        renderBar();
        renderSheet();
      } else if (a === 'send') {
        sendOrder();
      } else if (a === 'track') {
        openSheet({ type: 'track', id: act.dataset.id });
        pollOrders();
      } else if (a === 'more') {
        closeSheet();
      } else if (a === 'retry') {
        state = 'loading';
        renderMenu();
        refreshMenu();
      } else if (a === 'show-all') {
        $('#search').value = '';
        query = '';
        $('#search-clear').hidden = true;
        renderMenu();
      }
      return;
    }

    const sh = e.target.closest('[data-sheet]');
    if (sh) { openSheet({ type: sh.dataset.sheet }); return; }

    const langOpt = e.target.closest('[data-lang]');
    if (langOpt) {
      lang = langOpt.dataset.lang;
      store.set('lang', lang);
      closeSheet();
      renderAll();
      return;
    }

    const chip = e.target.closest('.chip');
    if (chip) {
      const sec = document.getElementById('cat-' + chip.dataset.cat);
      if (sec) {
        setActive(chip.dataset.cat);
        spyLockUntil = Date.now() + 900;
        sec.scrollIntoView({ behavior: smooth(), block: 'start' });
      }
      return;
    }

    const zoom = e.target.closest('[data-zoom]');
    if (zoom) { openViewer(zoom.dataset.zoom); return; }
    const open = e.target.closest('[data-open]');
    if (open) openSheet({ type: 'dish', id: open.dataset.open });
  });

  // фото не загрузилось — показываем аккуратную заглушку
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    const box = img.closest('.photo, .logo');
    if (!box) return;
    img.remove();
    if (box.classList.contains('logo')) { box.textContent = monogram(M?.restaurant.name); return; }
    box.classList.remove('has-img');
    box.insertAdjacentHTML('afterbegin', icon('dish'));
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-open]')) {
      e.preventDefault();
      openSheet({ type: 'dish', id: e.target.dataset.open });
    }
  });

  $('#order-bar').addEventListener('click', () => {
    const o = $('#order-bar').dataset.go || 'order';
    if (o.startsWith('track:')) { openSheet({ type: 'track', id: o.slice(6) }); pollOrders(); } else openSheet({ type: 'order' });
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'note-input') {
      note = e.target.value.slice(0, 300);
      store.set('note', note);
    }
    if (e.target.classList.contains('dn-input')) {
      const k = e.target.dataset.key;
      const v = e.target.value.replace(/\s+/g, ' ').slice(0, 120);
      if (v.trim()) dishNotes[k] = v; else delete dishNotes[k];
      saveDishNotes();
    }
  });
  $('#backdrop').addEventListener('click', closeSheet);
  $('#sheet-close').addEventListener('click', closeSheet);
  $('#search').addEventListener('input', (e) => {
    query = norm(e.target.value.trim());
    $('#search-clear').hidden = !query;
    renderMenu();
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search').value = '';
    query = '';
    $('#search-clear').hidden = true;
    renderMenu();
    $('#search').focus();
  });
  $('#lang-btn').addEventListener('click', () => openSheet({ type: 'lang' }));
  $('#theme-btn').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('theme', theme);
    applyTheme();
  });

  function renderAll() {
    renderFilterBtn();
    renderHeader();
    renderTableActions();
    renderMenu();
    renderBar();
    renderSheet();
  }

  applyTheme();
  renderAll();
  setInterval(() => {   // «Открыто / Закрыто» и завтрак по часам обновляются сами
    if (!M) return;
    renderHeader();
    if (M.categories.map((c) => catOpen(c)).join() !== lastOpenSig) { renderMenu(); refreshSlots(); renderBar(); }
  }, 60 * 1000);
  renderFilterBtn();
  if (ONLINE) {
    refreshMenu();
    setTimeout(loadStats, 1200);
    checkTable();
    pollOrders().then(() => schedulePoll());
    setInterval(() => { if (!document.hidden) refreshMenu(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMenu(); });
    window.addEventListener('online', () => refreshMenu());
  }
})();
