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
      wifi: 'Wi‑Fi', wifiNet: 'Сеть', wifiPass: 'Пароль', wifiNoPass: 'Без пароля', wifiHint: 'Подключитесь в настройках телефона: Wi‑Fi → эта сеть → пароль.', copy: 'Скопировать', copied: 'Скопировано',
      receipt: 'Чек', receiptTitle: (n) => `Чек №${n}`, receiptSave: 'Сохранить или распечатать', receiptWait: 'Чек появится здесь, когда официант закроет счёт.', receiptBack: 'К заказу',
      rcDate: 'Дата', rcWaiter: 'Официант', rcCashier: 'Кассир', rcOrders: 'Заказы', rcDiscount: 'Скидка', rcRounding: 'Округление', rcToPay: 'К оплате', rcTip: 'Чаевые', rcPaidTotal: 'Всего оплачено', rcThanks: 'Спасибо, что были у нас!',
      rcPay: { cash: 'Наличные', card: 'Карта', qr: 'QR', other: 'Другое' },
      googleAsk: 'Спасибо! Если вам понравилось — расскажите о нас в Google. Это очень помогает ресторану.', googleBtn: 'Оставить отзыв в Google',
      favAdd: 'Добавить в любимые', favRemove: 'Убрать из любимых', favs: 'Мои любимые',
      promo: 'Акция', promoUntil: (x) => `Акция до ${x}`, oldPrice: 'Обычная цена', dayDish: 'Блюдо дня',
      stockLeft: (n) => `Осталось ${n}`, stockMax: (n) => `Больше добавить нельзя — осталось ${n}`, errStockLeft: (a, n) => `${a}: осталось только ${n}. Уменьшите количество и отправьте ещё раз.`,
      bkBtn: 'Забронировать стол', bkTitle: 'Бронь стола', bkName: 'Имя', bkPhone: 'Телефон', bkPhonePh: '+60 12 345 6789', bkDate: 'День', bkTime: 'Время', bkPeople: 'Сколько гостей',
      bkNote: 'Пожелание', bkNotePh: 'Например: будем с ребёнком, нужен детский стул', bkSend: 'Забронировать', bkNoTimes: 'В этот день свободного времени уже нет — выберите другой день.', bkDayOff: 'выходной',
      bkNo: (n) => `Бронь №${n}`, bkGuests: (n) => { const a = n % 10; const b = n % 100; return `${n} ${a === 1 && b !== 11 ? 'гость' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'гостя' : 'гостей'}`; },
      bkStatus: { new: 'Ждём подтверждения', confirmed: 'Подтверждена', seated: 'Вы уже за столом', cancelled: 'Отменена', no_show: 'Бронь закрыта' }, bkTable: (x) => `стол ${x}`,
      bkWait: 'Ресторан подтвердит бронь — статус обновится здесь.', bkCancel: 'Отменить бронь', bkCancelAsk: (n) => `Отменить бронь №${n}?`, bkCancelYes: 'Да, отменить', bkCancelNo: 'Нет',
      bkCancelled: 'Бронь отменена', bkNew: 'Новая бронь', bkSent: 'Бронь отправлена', bkNeedName: 'Напишите имя.', bkNeedPhone: 'Проверьте телефон: только цифры, в начале можно +.', bkNeedTime: 'Выберите время.',
      bkErr: { bookings_off: 'Бронь через меню сейчас не принимается. Пожалуйста, позвоните в ресторан.', bad_time: 'Это время уже недоступно: бронь — минимум за 30 минут. Выберите другое время.', closed_then: 'В это время ресторан закрыт. Выберите другое время.', bad_request: 'Проверьте имя, телефон и число гостей.', too_many: 'С этого номера уже есть несколько броней. Если нужно ещё — позвоните в ресторан.' },
      voteTitle: 'Как вам блюда?', voteUp: 'Понравилось', voteDown: 'Не понравилось', del: 'Удалить', callDone: 'Официант уже идёт', billDone: 'Счёт несут', bkNet: 'Нет связи — бронь не изменилась. Проверьте интернет и попробуйте ещё раз.',
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
      wifi: 'Wi‑Fi', wifiNet: 'Tarmoq', wifiPass: 'Parol', wifiNoPass: 'Parolsiz', wifiHint: "Telefon sozlamalarida ulaning: Wi‑Fi → shu tarmoq → parol.", copy: 'Nusxalash', copied: 'Nusxalandi',
      receipt: 'Chek', receiptTitle: (n) => `Chek №${n}`, receiptSave: 'Saqlash yoki chop etish', receiptWait: "Ofitsiant hisobni yopganda chek shu yerda chiqadi.", receiptBack: 'Buyurtmaga',
      rcDate: 'Sana', rcWaiter: 'Ofitsiant', rcCashier: 'Kassir', rcOrders: 'Buyurtmalar', rcDiscount: 'Chegirma', rcRounding: 'Yaxlitlash', rcToPay: "To'lovga", rcTip: 'Choychaqa', rcPaidTotal: "Jami to'landi", rcThanks: 'Kelganingiz uchun rahmat!',
      rcPay: { cash: 'Naqd', card: 'Karta', qr: 'QR', other: 'Boshqa' },
      googleAsk: "Rahmat! Yoqqan bo'lsa, Google'da biz haqimizda yozing. Bu restoranga juda yordam beradi.", googleBtn: "Google'da sharh qoldirish",
      favAdd: "Sevimlilarga qo'shish", favRemove: 'Sevimlilardan olib tashlash', favs: 'Sevimlilarim',
      promo: 'Aksiya', promoUntil: (x) => `Aksiya ${x} gacha`, oldPrice: 'Oddiy narx', dayDish: 'Kun taomi',
      stockLeft: (n) => `${n} ta qoldi`, stockMax: (n) => `Boshqa qo'shib bo'lmaydi — ${n} ta qoldi`, errStockLeft: (a, n) => `${a}: faqat ${n} ta qoldi. Sonini kamaytirib, qayta yuboring.`,
      bkBtn: 'Stol band qilish', bkTitle: 'Stol band qilish', bkName: 'Ism', bkPhone: 'Telefon', bkPhonePh: '+60 12 345 6789', bkDate: 'Kun', bkTime: 'Vaqt', bkPeople: 'Necha kishi',
      bkNote: 'Istak', bkNotePh: 'Masalan: bola bilan kelamiz, bolalar stuli kerak', bkSend: 'Band qilish', bkNoTimes: "Bu kunda bo'sh vaqt qolmadi — boshqa kunni tanlang.", bkDayOff: 'dam olish',
      bkNo: (n) => `Bron №${n}`, bkGuests: (n) => `${n} kishi`,
      bkStatus: { new: 'Tasdiq kutilmoqda', confirmed: 'Tasdiqlandi', seated: 'Siz stoldasiz', cancelled: 'Bekor qilindi', no_show: 'Bron yopildi' }, bkTable: (x) => `stol ${x}`,
      bkWait: 'Restoran bronni tasdiqlaydi — holat shu yerda yangilanadi.', bkCancel: 'Bronni bekor qilish', bkCancelAsk: (n) => `Bron №${n} bekor qilinsinmi?`, bkCancelYes: 'Ha, bekor qilish', bkCancelNo: "Yo'q",
      bkCancelled: 'Bron bekor qilindi', bkNew: 'Yangi bron', bkSent: 'Bron yuborildi', bkNeedName: 'Ismingizni yozing.', bkNeedPhone: "Telefonni tekshiring: faqat raqamlar, boshida + bo'lishi mumkin.", bkNeedTime: 'Vaqtni tanlang.',
      bkErr: { bookings_off: "Hozir menyu orqali bron qabul qilinmayapti. Iltimos, restoranga qo'ng'iroq qiling.", bad_time: "Bu vaqt endi mavjud emas: bron kamida 30 daqiqa oldin qilinadi. Boshqa vaqtni tanlang.", closed_then: 'Bu vaqtda restoran yopiq. Boshqa vaqtni tanlang.', bad_request: 'Ism, telefon va mehmonlar sonini tekshiring.', too_many: "Bu raqamdan bir nechta bron bor. Yana kerak bo'lsa, restoranga qo'ng'iroq qiling." },
      voteTitle: 'Taomlar yoqdimi?', voteUp: 'Yoqdi', voteDown: 'Yoqmadi', del: "O'chirish", callDone: 'Ofitsiant kelmoqda', billDone: 'Hisob olib kelinmoqda', bkNet: "Aloqa yo'q — bron o'zgarmadi. Internetni tekshirib, qayta urinib ko'ring.",
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
      wifi: 'Wi‑Fi', wifiNet: 'Network', wifiPass: 'Password', wifiNoPass: 'No password', wifiHint: 'Connect in your phone settings: Wi‑Fi → this network → password.', copy: 'Copy', copied: 'Copied',
      receipt: 'Receipt', receiptTitle: (n) => `Receipt #${n}`, receiptSave: 'Save or print', receiptWait: 'Your receipt will appear here once the waiter closes the bill.', receiptBack: 'Back to order',
      rcDate: 'Date', rcWaiter: 'Waiter', rcCashier: 'Cashier', rcOrders: 'Orders', rcDiscount: 'Discount', rcRounding: 'Rounding', rcToPay: 'To pay', rcTip: 'Tip', rcPaidTotal: 'Total paid', rcThanks: 'Thank you for visiting us!',
      rcPay: { cash: 'Cash', card: 'Card', qr: 'QR', other: 'Other' },
      googleAsk: 'Thank you! If you enjoyed it, please tell others on Google. It really helps the restaurant.', googleBtn: 'Leave a Google review',
      favAdd: 'Add to favourites', favRemove: 'Remove from favourites', favs: 'My favourites',
      promo: 'Special', promoUntil: (x) => `Special until ${x}`, oldPrice: 'Regular price', dayDish: 'Dish of the day',
      stockLeft: (n) => `Only ${n} left`, stockMax: (n) => `Can't add more — only ${n} left`, errStockLeft: (a, n) => `${a}: only ${n} left. Lower the quantity and send again.`,
      bkBtn: 'Book a table', bkTitle: 'Table booking', bkName: 'Name', bkPhone: 'Phone', bkPhonePh: '+60 12 345 6789', bkDate: 'Day', bkTime: 'Time', bkPeople: 'Guests',
      bkNote: 'Request', bkNotePh: 'For example: coming with a child, need a high chair', bkSend: 'Book', bkNoTimes: 'No free time left on this day — please pick another day.', bkDayOff: 'closed',
      bkNo: (n) => `Booking #${n}`, bkGuests: (n) => `${n} ${n === 1 ? 'guest' : 'guests'}`,
      bkStatus: { new: 'Waiting for confirmation', confirmed: 'Confirmed', seated: "You're seated", cancelled: 'Cancelled', no_show: 'Booking closed' }, bkTable: (x) => `table ${x}`,
      bkWait: 'The restaurant will confirm your booking — the status updates here.', bkCancel: 'Cancel booking', bkCancelAsk: (n) => `Cancel booking #${n}?`, bkCancelYes: 'Yes, cancel', bkCancelNo: 'No',
      bkCancelled: 'Booking cancelled', bkNew: 'New booking', bkSent: 'Booking sent', bkNeedName: 'Please enter your name.', bkNeedPhone: 'Check the phone number: digits only, + allowed at the start.', bkNeedTime: 'Please pick a time.',
      bkErr: { bookings_off: 'Bookings through the menu are closed right now. Please call the restaurant.', bad_time: 'This time is no longer available: book at least 30 minutes ahead. Please pick another time.', closed_then: 'The restaurant is closed at that time. Please pick another time.', bad_request: 'Please check the name, phone and number of guests.', too_many: 'This number already has several bookings. Please call the restaurant if you need more.' },
      voteTitle: 'How were the dishes?', voteUp: 'Liked it', voteDown: "Didn't like it", del: 'Delete', callDone: 'A waiter is coming', billDone: 'Bill is on its way', bkNet: 'No connection — the booking was not changed. Check the internet and try again.',
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
      wifi: 'Wi‑Fi', wifiNet: 'الشبكة', wifiPass: 'كلمة المرور', wifiNoPass: 'بدون كلمة مرور', wifiHint: 'اتصل من إعدادات الهاتف: Wi‑Fi ← هذه الشبكة ← كلمة المرور.', copy: 'نسخ', copied: 'تم النسخ',
      receipt: 'الإيصال', receiptTitle: (n) => `إيصال رقم ${n}`, receiptSave: 'حفظ أو طباعة', receiptWait: 'سيظهر الإيصال هنا عندما يغلق النادل الحساب.', receiptBack: 'العودة إلى الطلب',
      rcDate: 'التاريخ', rcWaiter: 'النادل', rcCashier: 'أمين الصندوق', rcOrders: 'الطلبات', rcDiscount: 'خصم', rcRounding: 'التقريب', rcToPay: 'المبلغ المستحق', rcTip: 'إكرامية', rcPaidTotal: 'إجمالي المدفوع', rcThanks: 'شكرًا لزيارتكم!',
      rcPay: { cash: 'نقدًا', card: 'بطاقة', qr: 'QR', other: 'أخرى' },
      googleAsk: 'شكرًا لك! إذا أعجبك المكان، شارك رأيك على Google. هذا يساعد المطعم كثيرًا.', googleBtn: 'اكتب تقييمًا على Google',
      favAdd: 'أضف إلى المفضلة', favRemove: 'إزالة من المفضلة', favs: 'المفضلة لدي',
      promo: 'عرض', promoUntil: (x) => `عرض حتى ${x}`, oldPrice: 'السعر العادي', dayDish: 'طبق اليوم',
      stockLeft: (n) => `بقي ${n}`, stockMax: (n) => `لا يمكن إضافة المزيد — بقي ${n}`, errStockLeft: (a, n) => `${a}: بقي ${n} فقط. قلّل الكمية وأرسل مرة أخرى.`,
      bkBtn: 'احجز طاولة', bkTitle: 'حجز طاولة', bkName: 'الاسم', bkPhone: 'الهاتف', bkPhonePh: '+60 12 345 6789', bkDate: 'اليوم', bkTime: 'الوقت', bkPeople: 'عدد الضيوف',
      bkNote: 'طلب خاص', bkNotePh: 'مثلًا: سنأتي مع طفل ونحتاج كرسيًا للأطفال', bkSend: 'احجز', bkNoTimes: 'لا يوجد وقت متاح في هذا اليوم — اختر يومًا آخر.', bkDayOff: 'مغلق',
      bkNo: (n) => `حجز رقم ${n}`, bkGuests: (n) => (n === 1 ? 'ضيف واحد' : n === 2 ? 'ضيفان' : `${n} ${n <= 10 ? 'ضيوف' : 'ضيفًا'}`),
      bkStatus: { new: 'بانتظار التأكيد', confirmed: 'تم التأكيد', seated: 'أنتم على الطاولة', cancelled: 'أُلغي', no_show: 'أُغلق الحجز' }, bkTable: (x) => `طاولة ${x}`,
      bkWait: 'سيؤكد المطعم الحجز — ستتحدث الحالة هنا.', bkCancel: 'إلغاء الحجز', bkCancelAsk: (n) => `إلغاء الحجز رقم ${n}؟`, bkCancelYes: 'نعم، ألغِ', bkCancelNo: 'لا',
      bkCancelled: 'تم إلغاء الحجز', bkNew: 'حجز جديد', bkSent: 'تم إرسال الحجز', bkNeedName: 'اكتب اسمك.', bkNeedPhone: 'تحقق من رقم الهاتف: أرقام فقط، ويمكن البدء بـ +.', bkNeedTime: 'اختر الوقت.',
      bkErr: { bookings_off: 'الحجز عبر القائمة غير متاح الآن. يرجى الاتصال بالمطعم.', bad_time: 'هذا الوقت لم يعد متاحًا: الحجز قبل 30 دقيقة على الأقل. اختر وقتًا آخر.', closed_then: 'المطعم مغلق في هذا الوقت. اختر وقتًا آخر.', bad_request: 'تحقق من الاسم والهاتف وعدد الضيوف.', too_many: 'لدى هذا الرقم عدة حجوزات بالفعل. اتصل بالمطعم إذا احتجت المزيد.' },
      voteTitle: 'ما رأيك في الأطباق؟', voteUp: 'أعجبني', voteDown: 'لم يعجبني', del: 'حذف', callDone: 'النادل في الطريق', billDone: 'الفاتورة في الطريق', bkNet: 'لا يوجد اتصال — لم يتغير الحجز. تحقق من الإنترنت وحاول مرة أخرى.',
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
      wifi: 'Wi‑Fi', wifiNet: 'Rangkaian', wifiPass: 'Kata laluan', wifiNoPass: 'Tiada kata laluan', wifiHint: 'Sambung dalam tetapan telefon: Wi‑Fi → rangkaian ini → kata laluan.', copy: 'Salin', copied: 'Disalin',
      receipt: 'Resit', receiptTitle: (n) => `Resit #${n}`, receiptSave: 'Simpan atau cetak', receiptWait: 'Resit akan muncul di sini selepas pelayan menutup bil.', receiptBack: 'Kembali ke pesanan',
      rcDate: 'Tarikh', rcWaiter: 'Pelayan', rcCashier: 'Juruwang', rcOrders: 'Pesanan', rcDiscount: 'Diskaun', rcRounding: 'Pembundaran', rcToPay: 'Perlu dibayar', rcTip: 'Tip', rcPaidTotal: 'Jumlah dibayar', rcThanks: 'Terima kasih kerana berkunjung!',
      rcPay: { cash: 'Tunai', card: 'Kad', qr: 'QR', other: 'Lain-lain' },
      googleAsk: 'Terima kasih! Jika anda suka, kongsi pengalaman anda di Google. Ia sangat membantu restoran.', googleBtn: 'Tulis ulasan di Google',
      favAdd: 'Tambah ke kegemaran', favRemove: 'Buang dari kegemaran', favs: 'Kegemaran saya',
      promo: 'Promosi', promoUntil: (x) => `Promosi hingga ${x}`, oldPrice: 'Harga biasa', dayDish: 'Hidangan hari ini',
      stockLeft: (n) => `Tinggal ${n}`, stockMax: (n) => `Tidak boleh tambah lagi — tinggal ${n}`, errStockLeft: (a, n) => `${a}: tinggal ${n} sahaja. Kurangkan kuantiti dan hantar semula.`,
      bkBtn: 'Tempah meja', bkTitle: 'Tempahan meja', bkName: 'Nama', bkPhone: 'Telefon', bkPhonePh: '+60 12 345 6789', bkDate: 'Hari', bkTime: 'Masa', bkPeople: 'Bilangan tetamu',
      bkNote: 'Permintaan', bkNotePh: 'Contoh: datang bersama anak, perlukan kerusi bayi', bkSend: 'Tempah', bkNoTimes: 'Tiada masa kosong pada hari ini — sila pilih hari lain.', bkDayOff: 'tutup',
      bkNo: (n) => `Tempahan #${n}`, bkGuests: (n) => `${n} orang`,
      bkStatus: { new: 'Menunggu pengesahan', confirmed: 'Disahkan', seated: 'Anda sudah di meja', cancelled: 'Dibatalkan', no_show: 'Tempahan ditutup' }, bkTable: (x) => `meja ${x}`,
      bkWait: 'Restoran akan mengesahkan tempahan — status dikemas kini di sini.', bkCancel: 'Batalkan tempahan', bkCancelAsk: (n) => `Batalkan tempahan #${n}?`, bkCancelYes: 'Ya, batalkan', bkCancelNo: 'Tidak',
      bkCancelled: 'Tempahan dibatalkan', bkNew: 'Tempahan baharu', bkSent: 'Tempahan dihantar', bkNeedName: 'Sila tulis nama anda.', bkNeedPhone: 'Semak nombor telefon: angka sahaja, boleh bermula dengan +.', bkNeedTime: 'Sila pilih masa.',
      bkErr: { bookings_off: 'Tempahan melalui menu ditutup buat masa ini. Sila hubungi restoran.', bad_time: 'Masa ini tidak lagi tersedia: tempah sekurang-kurangnya 30 minit lebih awal. Sila pilih masa lain.', closed_then: 'Restoran tutup pada masa itu. Sila pilih masa lain.', bad_request: 'Sila semak nama, telefon dan bilangan tetamu.', too_many: 'Nombor ini sudah ada beberapa tempahan. Hubungi restoran jika perlu lagi.' },
      voteTitle: 'Bagaimana hidangannya?', voteUp: 'Suka', voteDown: 'Tidak suka', del: 'Padam', callDone: 'Pelayan sedang datang', billDone: 'Bil sedang dibawa', bkNet: 'Tiada sambungan — tempahan tidak berubah. Semak internet dan cuba lagi.',
    },
    zh: {
      langName: '中文', locale: 'zh-CN', dir: 'ltr',
      menuWord: '菜单',
      search: '搜索菜单', clearSearch: '清除搜索',
      order: '我的订单', total: '合计', clear: '清空列表',
      nothing: '没有找到', nothingHint: '换个词试试，或查看完整菜单。', showAll: '查看完整菜单',
      add: '添加', remove: '减少一份', removeItem: '删除',
      waiter: '请把这个列表给服务员看，即可下单。',
      orderEmpty: '列表是空的。点“+”添加菜品。',
      g: '克', ml: '毫升', kcal: '千卡', pcs: () => '个',
      table: '桌号',
      ingredients: '配料', allergens: '过敏原',
      close: '关闭', themeDark: '深色模式', themeLight: '浅色模式', language: '语言',
      tags: { hit: '人气', new: '新品', spicy: '辣', veg: '素食' },
      allergenNames: { gluten: '麸质', milk: '牛奶', eggs: '鸡蛋', fish: '鱼', shellfish: '贝类', nuts: '坚果', soy: '大豆', sesame: '芝麻' },
      soldOut: '已售完', soldOutRow: '暂时售完 — 不计入合计',
      unavailableNotice: (n) => `暂时没有：${n}。这些菜不计入合计 — 请删除或询问服务员。`,
      priceNotice: (n) => `价格已变动：${n}。合计已重新计算。`,
      listUpdated: '菜单已更新 — 请检查您的列表。',
      open: '营业中', closed: '已打烊', until: (x) => `营业至 ${x}`,
      opensToday: (x) => `${x} 开门`, opensTomorrow: (x) => `明天 ${x} 开门`,
      opensOn: (d, x) => `${['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][d]} ${x} 开门`,
      closedForNow: '暂停营业',
      hours: '营业时间', daily: '每天', dayOff: '休息', today: '今天',
      tzNote: (tz) => `时间按餐厅所在时区显示（${tz}）。`,
      days: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
      openMap: '在地图中打开', call: '拨打电话',
      loading: '正在加载菜单…', loadError: '菜单加载失败', loadErrorHint: '请检查网络后重试。', retry: '重试',
      emptyMenu: '菜单即将上线', emptyMenuHint: '餐厅正在完善菜单，请询问服务员。',
      offline: '没有网络 — 显示之前加载的菜单。',
      sendOrder: '提交订单', sending: '正在提交…',
      noteLabel: '订单备注', notePh: '例如：我有糖尿病，对坚果过敏，全部不要洋葱',
      noteHint: '用您自己的话写 — 服务员和厨师会马上看到。', dishNote: '这道菜的要求', dishNotePh: '例如：不要洋葱，少放盐', noteDone: '完成',
      yourTable: '您的桌号',
      noTable: '要下单，请扫描桌上的二维码。',
      badTable: '这个二维码无效，或该桌已停用。请询问服务员。',
      checkingTable: '正在确认桌号…',
      noServer: '在线点餐尚未开通。请把这个列表给服务员看。',
      ordersOff: '目前暂停菜单点餐。请呼叫服务员。',
      closedNoOrders: '餐厅已打烊 — 暂不接受订单。',
      removeSold: '请先从订单中删除已售完的菜品，然后再提交。',
      errNetwork: '没有网络 — 订单未提交。请检查网络后再点“提交订单”。',
      errServer: '服务器没有响应 — 订单未提交。请重试。',
      errTooMany: '这张桌子的订单太多了。请稍等几分钟或呼叫服务员。',
      errChanged: '菜单有变动。请检查订单后重新提交。',
      sentTitle: (n) => `订单 №${n} 已提交`,
      orderNo: (n) => `订单 №${n}`,
      sentAt: (x) => `${x} 提交`,
      statuses: { new: '已提交', accepted: '服务员已接单', cooking: '制作中', ready: '已做好 — 正在上菜', served: '已上菜', cancelled: '已取消' },
      meatNames: { beef: '牛肉', lamb: '羊肉', horse: '马肉', chicken: '鸡肉', fish: '鱼', seafood: '海鲜' }, halal: '清真', meatLabel: '肉类',
      statusHint: { new: '订单已收到 — 服务员和厨房已经看到了。', accepted: '服务员已接单。', cooking: '厨师正在制作您的订单。', ready: '订单已做好 — 服务员正在送来。', served: '请慢用！', cancelled: '订单已取消。请与服务员沟通。' },
      statusStale: '状态刷新失败 — 几秒后会再次检查。',
      myOrders: '我的订单', orderMore: '继续点菜', note: '备注',
      servedAt: (a, b) => `供应时间 ${a}–${b}`, fromTime: (a) => `${a} 起`, notNowRow: (a, b) => `供应时间 ${a} 至 ${b}`, nowServing: '现在供应',
      readyToast: '订单已做好 — 服务员正在送来！', stepAccepted: '已接单', stepCooking: '制作中', stepReady: '已做好',
      tableBill: '本桌账单', tableBillHint: '本桌所有未付款的订单 — 包括您和朋友的。', tableBillEmpty: '本桌没有未付款的订单。', tableTotal: '本桌合计',
      reqTitle: '您需要什么？', reqCome: '请过来一下', reqs: { water: '水', napkins: '纸巾', cutlery: '餐具', ice: '冰块', clear: '收拾桌子' }, reqPending: '已呼叫',
      filter: '筛选', fVeg: '无肉', fSpicy: '辣', fNo: '不含', fReset: '重置', fShow: (n) => `显示（${n}）`, fNote: '配料和过敏原信息由餐厅提供。如有过敏，请向服务员确认。',
      hits: '人气菜品', pairs: '搭配推荐', upsell: '加到订单里吗？',
      rateTitle: '您觉得怎么样？', ratePh: '您喜欢什么，或者哪里可以更好？', rateSend: '提交评价', rateThanks: '感谢您的评价！', rateStar: (n) => `${n} 星（满分 5 星）`,
      repeat: '再点一次', repeatDone: (n) => `已加入列表：${n}`, repeatSome: '部分菜品暂时没有 — 已跳过。',
      prep: (n) => `约 ${n} 分钟`, photoOf: (a, b) => `${a} / ${b}`,
      callWaiter: '呼叫服务员', askBill: '买单', waiterComing: '服务员马上来', billComing: '账单马上送来',
      callSent: '服务员已收到呼叫，马上过来。', billSent: '服务员会把账单送过来。', callErr: '呼叫没有发出。请向服务员招手或重试。',
      payHow: '您想怎么付款？', payCash: '现金', payCard: '刷卡', payQr: '扫码支付',
      subtotal: '菜品', service: (p) => `服务费${p ? ` ${p}%` : ''}`, paid: '已付款',
      required: '必选', optional: '可选', addFor: (s) => `添加 · ${s}`, chooseOptions: '选择规格',
      edited: (x) => `餐厅在 ${x} 修改了您的订单`,
      wifi: 'Wi‑Fi', wifiNet: '网络', wifiPass: '密码', wifiNoPass: '无密码', wifiHint: '在手机设置中连接：Wi‑Fi → 这个网络 → 密码。', copy: '复制', copied: '已复制',
      receipt: '收据', receiptTitle: (n) => `收据 №${n}`, receiptSave: '保存或打印', receiptWait: '服务员结账后，收据会显示在这里。', receiptBack: '返回订单',
      rcDate: '日期', rcWaiter: '服务员', rcCashier: '收银员', rcOrders: '订单', rcDiscount: '折扣', rcRounding: '四舍五入', rcToPay: '应付', rcTip: '小费', rcPaidTotal: '实付合计', rcThanks: '感谢光临！',
      rcPay: { cash: '现金', card: '刷卡', qr: '扫码', other: '其他' },
      googleAsk: '谢谢！如果您喜欢，请在 Google 上分享您的体验。这对餐厅帮助很大。', googleBtn: '在 Google 上评价',
      favAdd: '加入收藏', favRemove: '取消收藏', favs: '我的收藏',
      promo: '特价', promoUntil: (x) => `特价至 ${x}`, oldPrice: '原价', dayDish: '今日推荐',
      stockLeft: (n) => `仅剩 ${n} 份`, stockMax: (n) => `无法再加 — 仅剩 ${n} 份`, errStockLeft: (a, n) => `${a}：仅剩 ${n} 份。请减少数量后再次发送。`,
      bkBtn: '预订餐桌', bkTitle: '预订餐桌', bkName: '姓名', bkPhone: '电话', bkPhonePh: '+60 12 345 6789', bkDate: '日期', bkTime: '时间', bkPeople: '人数',
      bkNote: '备注', bkNotePh: '例如：带小孩来，需要儿童椅', bkSend: '预订', bkNoTimes: '这一天已没有可订时间 — 请选择其他日期。', bkDayOff: '休息',
      bkNo: (n) => `预订 #${n}`, bkGuests: (n) => `${n} 位`,
      bkStatus: { new: '等待确认', confirmed: '已确认', seated: '您已入座', cancelled: '已取消', no_show: '预订已关闭' }, bkTable: (x) => `${x} 号桌`,
      bkWait: '餐厅会确认您的预订 — 状态会在这里更新。', bkCancel: '取消预订', bkCancelAsk: (n) => `取消预订 #${n}？`, bkCancelYes: '是，取消', bkCancelNo: '不',
      bkCancelled: '预订已取消', bkNew: '新预订', bkSent: '预订已发送', bkNeedName: '请填写姓名。', bkNeedPhone: '请检查电话号码：只能是数字，开头可以有 +。', bkNeedTime: '请选择时间。',
      bkErr: { bookings_off: '目前无法通过菜单预订。请致电餐厅。', bad_time: '该时间已不可订：至少需提前 30 分钟预订。请选择其他时间。', closed_then: '餐厅在该时间不营业。请选择其他时间。', bad_request: '请检查姓名、电话和人数。', too_many: '该号码已有多个预订。如需更多，请致电餐厅。' },
      voteTitle: '菜品怎么样？', voteUp: '喜欢', voteDown: '不喜欢', del: '删除', callDone: '服务员马上来', billDone: '账单马上送到', bkNet: '没有网络 — 预订没有变化。请检查网络后重试。',
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
        defaultLanguage: b.defaultLanguage, bookingsEnabled: false,
      },
      categories: b.categories.map((c) => ({ id: c.id, name: c.name, from: c.from || null, to: c.to || null })),
      dishes: b.dishes.filter((d) => !d.hidden).map((d) => ({
        id: d.id, category: d.category, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
        price: Number(d.price), weight: d.weight ?? null, unit: d.unit || 'g', kcal: d.kcal ?? null, photo: d.photo || null,
        tags: d.tags || [], allergens: d.allergens || [], meat: d.meat || [], available: d.available !== false,
        options: Array.isArray(d.options) ? d.options : [], prepMin: d.prepMin || null, pairs: d.pairs || [],
        promoPrice: null, promoFrom: null, promoTo: null, featured: false, stock: null,
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
        googleReviewUrl: /^https:\/\//.test(st.google_review_url || '') ? st.google_review_url : null, receiptInfo: st.receipt_info || '',
        address: nonEmpty(st.address), mapUrl: st.map_url || null, phone: st.phone || '', footer: nonEmpty(st.footer),
        ordersEnabled: !!st.orders_enabled, ordersWhenClosed: !!st.orders_when_closed,
        servicePct: Number(st.service_pct) || 0, taxPct: Number(st.tax_pct) || 0, taxName: st.tax_name || 'SST', taxOnService: st.tax_on_service !== false,
        halal: !!st.halal, halalNote: nonEmpty(st.halal_note),
        defaultLanguage: st.default_language, bookingsEnabled: st.bookings_enabled !== false,
      },
      categories: shown.map((c) => ({ id: c.id, name: c.name, from: c.avail_from || null, to: c.avail_to || null })),
      dishes: dishes.filter((d) => !d.hidden && ids.has(d.category_id))
        .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
        .map((d) => ({
          id: d.id, category: d.category_id, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
          price: Number(d.price), weight: d.weight, unit: d.unit, kcal: d.kcal, photo: d.photo_url || null,
          // остаток 0 = то же, что «нет в наличии» (сервер такой заказ не примет)
          tags: d.tags || [], allergens: d.allergens || [], meat: d.meat || [], available: !!d.available && d.stock !== 0,
          options: Array.isArray(d.options) ? d.options : [], prepMin: d.prep_min || null, pairs: Array.isArray(d.pairs) ? d.pairs : [],
          // акция: цена ниже обычной, весь день или в свои часы; «Блюдо дня»; остаток порций (пусто — не считаем)
          promoPrice: d.promo_price != null && Number(d.promo_price) < Number(d.price) ? Number(d.promo_price) : null,
          promoFrom: d.promo_from && d.promo_to ? d.promo_from : null, promoTo: d.promo_from && d.promo_to ? d.promo_to : null,
          featured: !!d.featured, stock: d.stock == null ? null : Number(d.stock),
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
  let wifi = null;            // { name, pass } — приходит вместе со столом (только гостю за столом)
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
  // сейчас внутри часов «с–до» (может переходить через полночь) — по часам ресторана, как category_open на сервере
  function inHours(from, to) {
    const m = SCH.localNow(R().timezone, new Date()).min;
    const f = SCH.mins(from);
    const e = SCH.mins(to);
    return e > f ? m >= f && m < e : m >= f || m < e;
  }
  function catOpen(c) {
    if (!c?.from || !c?.to) return true;
    return inHours(c.from, c.to);
  }
  // цена по акции идёт прямо сейчас? Та же проверка, что dish_price на сервере
  const promoNow = (d) => !!d && d.promoPrice != null && d.promoPrice < Number(d.price) && (!d.promoFrom || !d.promoTo || inHours(d.promoFrom, d.promoTo));
  const priceOf = (d) => (promoNow(d) ? Number(d.promoPrice) : Number(d.price));
  // меняется со временем: завтрак открылся, акция началась или закончилась
  const timeSig = () => `${(M?.categories || []).map((c) => catOpen(c)).join()}|${(M?.dishes || []).filter(promoNow).map((d) => d.id).join()}`;
  const orderable = (d) => !!d && d.available && catOpen(catOf(d));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  const itemName = (id) => L(byId[id]?.name) || L((seen[id] || Object.entries(seen).find(([k]) => parseKey(k).id === id)?.[1])?.name) || '…';

  // Строка списка: ключ «блюдо» или «блюдо|группа:вариант,…» — одно блюдо с разными вариантами = разные строки
  const makeKey = (id, opts) => (opts && opts.length ? `${id}|${[...opts].sort().join(',')}` : id);
  const parseKey = (key) => { const [id, rest] = String(key).split('|'); return { id, opts: rest ? rest.split(',').filter(Boolean) : [] }; };
  const hasOptions = (d) => Array.isArray(d?.options) && d.options.length > 0;
  // выбранные варианты по ТЕКУЩЕМУ меню: подходят ли, цена за штуку, подписи
  function optInfo(d, opts) {
    if (!d) return { ok: false, unit: 0, names: [] };
    let unit = priceOf(d);   // цена по акции, если она сейчас идёт
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
    if (wifi && tableState !== 'invalid') badges.push(`<button type="button" class="badge" data-sheet="wifi">${icon('wifi', 'sm')}${esc(t('wifi'))}</button>`);
    badges.push(`<button type="button" class="badge ${st.open ? 'ok' : 'off'}" data-sheet="hours" aria-label="${esc(`${st.text}. ${t('hours')}`)}"><span class="dot"></span>${esc(st.text)}${icon('chevron', 'sm chev')}</button>`);
    if (ONLINE && (booking || r.bookingsEnabled)) {
      const on = bkActive();
      badges.push(`<button type="button" class="badge bk-badge${on ? ' on' : ''}" data-act="booking">${icon('calendar', 'sm')}${esc(on ? t('bkNo')(booking.no) : t('bkBtn'))}</button>`);
    }
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
  function photo(d, cls = '', flag = false, extra = '') {
    const kind = d?.photo ? '' : phKind(d);
    const img = d?.photo
      ? `<img src="${esc(d.photo)}" alt="${esc(L(d.name))}" loading="lazy" decoding="async" width="800" height="600" onload="this.dataset.ok=1" onerror="this.dataset.ok=1">`
      : icon(kind === 'dish' ? 'dish' : `ph-${kind}`);
    const sold = flag && d && !d.available ? `<span class="sold-flag">${esc(t('soldOut'))}</span>` : '';
    return `<div class="photo ${cls}${d?.photo ? ' has-img' : ` ph ph-${kind}`}">${img}${sold}${extra}</div>`;
  }

  // метки: акция (с часами — «до 17:00»), «осталось 3», потом метки ресторана
  function tagsHtml(d) {
    const list = [];
    if (promoNow(d)) list.push(`<span class="tag tag-promo">${esc(d.promoTo ? t('promoUntil')(clock(d.promoTo)) : t('promo'))}</span>`);
    if (d.available && d.stock > 0 && d.stock <= 5) list.push(`<span class="tag tag-left">${esc(t('stockLeft')(d.stock))}</span>`);
    for (const k of d.tags || []) list.push(`<span class="tag tag-${esc(k)}">${esc(t('tags')[k] || k)}</span>`);
    return list.length ? `<div class="tags">${list.join('')}</div>` : '';
  }

  // цена: по акции — обычная зачёркнута, цена акции акцентом
  function priceHtml(d, cls = '') {
    if (!promoNow(d)) return `<span class="price${cls ? ` ${cls}` : ''}">${money(d.price)}</span>`;
    return `<span class="price-promo"><span class="price promo${cls ? ` ${cls}` : ''}">${money(d.promoPrice)}</span><s class="old-price"><span class="sr-only">${esc(t('oldPrice'))}: </span>${money(d.price)}</s></span>`;
  }

  // ---------- Любимые блюда (только на этом телефоне) ----------
  let favs = (() => { const v = store.get('favs', []); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 100) : []; })();
  const isFav = (id) => favs.includes(id);
  const favLabel = (id) => `${t(isFav(id) ? 'favRemove' : 'favAdd')}: ${itemName(id)}`;
  function favBtn(id) {
    const on = isFav(id);
    return `<button type="button" class="fav-btn${on ? ' on' : ''}" data-act="fav" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${esc(favLabel(id))}">${icon('heart')}</button>`;
  }
  function favsHtml() {
    if (query || filterCount()) return '';
    const list = favs.map((id) => byId[id]).filter(Boolean);
    if (!list.length) return '';
    return `<section class="hits favs" aria-labelledby="h-favs"><div class="cat-title"><h2 id="h-favs">${esc(t('favs'))}</h2></div>
      <div class="hits-row">${list.map(miniCard).join('')}</div></section>`;
  }
  // меняем только сердечки и ряд «Мои любимые» — остальное меню не перерисовываем (фото не мигают)
  function toggleFav(id, btn) {
    favs = isFav(id) ? favs.filter((x) => x !== id) : [id, ...favs];
    store.set('favs', favs);
    // точка опоры: нажатое сердечко в меню (или первый видимый раздел) — после вставки ряда экран не прыгает
    const anchor = btn?.closest('#menu') && !btn.closest('.favs') ? btn
      : [...document.querySelectorAll('#menu > section.cat')].find((x) => x.getBoundingClientRect().bottom > 0) || null;
    const top0 = anchor?.getBoundingClientRect().top;
    document.querySelectorAll('.fav-btn').forEach((b) => {
      const on = isFav(b.dataset.id);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', favLabel(b.dataset.id));
    });
    const old = $('#menu > .favs');
    const html = favsHtml();
    if (old) { if (html) old.outerHTML = html; else old.remove(); } else if (html) $('#menu > .hits:not(.day-dish), #menu > section.cat')?.insertAdjacentHTML('beforebegin', html);
    if (anchor && document.contains(anchor)) {
      const dy = anchor.getBoundingClientRect().top - top0;
      if (dy) window.scrollBy({ top: dy, behavior: 'instant' });
    }
    // сердечко «подпрыгивает» — только по нажатию
    if (!reduced()) {
      document.querySelectorAll(`.fav-btn[data-id="${CSS.escape(id)}"]`).forEach((b) => {
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        b.addEventListener('animationend', () => b.classList.remove('pop'), { once: true });
      });
    }
  }

  // ---------- «Блюдо дня» ----------
  function dayHtml() {
    if (query || filterCount()) return '';
    const list = (M?.dishes || []).filter((d) => d.featured && d.available);
    if (!list.length) return '';
    const title = `<div class="cat-title"><h2 id="h-day">${esc(t('dayDish'))}</h2></div>`;
    if (list.length > 1) return `<section class="hits day-dish" aria-labelledby="h-day">${title}<div class="hits-row">${list.map(miniCard).join('')}</div></section>`;
    const d = list[0];
    const desc = L(d.desc);
    return `<section class="day-dish" aria-labelledby="h-day">${title}
      <article class="feature" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        ${photo(d, 'feature-photo', false, favBtn(d.id))}
        <div class="feature-body">${tagsHtml(d)}<h3>${esc(L(d.name))}</h3>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}
          <div class="card-foot"><div class="price-wrap">${priceHtml(d)}<span class="amount">${esc(amount(d))}</span></div><div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div></div>
        </div></article></section>`;
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
        ${photo(d, '', true, favBtn(d.id))}
        <div class="card-body">
          ${tagsHtml(d)}
          <h3>${esc(L(d.name))}</h3>
          ${compo || (desc ? `<p class="desc">${esc(desc)}</p>` : '<p class="desc"></p>')}
          <div class="card-foot">
            <div class="price-wrap">${priceHtml(d)}<span class="amount">${esc([amount(d), d.prepMin ? t('prep')(d.prepMin) : ''].filter(Boolean).join(' · '))}</span></div>
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
    lastOpenSig = timeSig();

    cats.innerHTML = groups.map(({ c }) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(L(c.name))}</button>`).join('');

    const offline = (stale ? `<p class="notice info" role="status">${icon('alert')}<span>${esc(t('offline'))}</span></p>` : '')
      + (ONLINE && tableState === 'invalid' ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('badTable'))}</span></p>` : '');
    if (!M.dishes.length) {
      main.innerHTML = `${offline}<div class="state">${icon('dish')}<h2>${esc(t('emptyMenu'))}</h2><p>${esc(t('emptyMenuHint'))}</p></div>`;
    } else if (!groups.length) {
      main.innerHTML = `${offline}<div class="state">${icon('search')}<h2>${esc(t('nothing'))}</h2>
        <p>${esc(t('nothingHint'))}</p><button type="button" class="btn ghost" data-act="show-all">${esc(t('showAll'))}</button></div>`;
    } else {
      main.innerHTML = offline + dayHtml() + favsHtml() + hitsHtml() + groups.map(({ c, items }) => `
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
      ${photo(d, 'mini-photo', false, favBtn(d.id))}<b>${esc(L(d.name))}</b>
      <div class="mini-foot">${priceHtml(d)}<div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div></div></article>`;
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
      ${photo(d, 'pair-photo')}<span class="grow"><b>${esc(L(d.name))}</b><small>${money(priceOf(d))}</small></span>
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
      roll('bar', [bar.querySelector('.bar-sum')], tot);
    } else if (last) {
      bar.dataset.go = 'track:' + last.id;
      const st = guestStatus(last.data.status);
      bar.innerHTML = `<span class="bar-left">${icon('list')}<span class="bar-txt">${esc(t('orderNo')(last.no))}</span></span><span class="bar-sum st-${esc(st)}">${st === 'accepted' ? icon('check', 'sm') : ''}<span class="bar-txt">${esc(t('statuses')[st])}</span></span>`;
      bar.setAttribute('aria-label', `${t('orderNo')(last.no)}: ${t('statuses')[st]}`);
    }
    // пока блюдо летит в плашку, она «подпрыгнет» в момент приземления
    if (count > (renderBar.lastCount || 0) && !bar.hidden && !flyHold) bumpBar();
    renderBar.lastCount = count;
    if (!count) delete rolls.bar;
    bar.hidden = !count && !last;
    document.body.classList.toggle('has-bar', !bar.hidden);
  }

  function bumpBar() {
    const bar = $('#order-bar');
    bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump');
  }

  // ---------- Сумма плавно «докручивается» до нового значения ----------
  // В конце всегда ставим точное значение, новая перерисовка прерывает старую анимацию.
  const rolls = {};   // где → { cur, raf }
  function roll(where, els, to) {
    els = els.filter(Boolean);
    const r = rolls[where] || (rolls[where] = { cur: null, raf: 0 });
    cancelAnimationFrame(r.raf);
    const from = r.cur;
    r.cur = to;
    if (from == null || from === to || reduced() || !els.length) { els.forEach((el) => { el.textContent = money(to); }); return; }
    const whole = Number.isInteger(from) && Number.isInteger(to);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 350);
      const v = p < 1 ? from + (to - from) * (1 - (1 - p) ** 3) : to;
      const shown = p < 1 ? (whole ? Math.round(v) : Math.round(v * 100) / 100) : to;
      els.forEach((el) => { el.textContent = money(shown); });
      r.cur = v;
      if (p < 1) r.raf = requestAnimationFrame(step); else r.cur = to;
    };
    els.forEach((el) => { el.textContent = money(from); });
    r.cur = from;
    r.raf = requestAnimationFrame(step);
  }

  // ---------- Полёт блюда в «Мой заказ» ----------
  // круглая копия фото летит по дуге: X — равномерно, Y — сначала вверх, потом вниз (только transform/opacity)
  let flyHold = false;
  function flyToBar(src) {
    const bar = $('#order-bar');
    if (bar.hidden || !src) return false;
    const a = src.getBoundingClientRect();
    const b = (bar.querySelector('.count') || bar).getBoundingClientRect();
    if (!a.width || !b.width) return false;
    const size = 44;
    const x0 = a.left + a.width / 2 - size / 2;
    const y0 = a.top + a.height / 2 - size / 2;
    const outer = document.createElement('div');
    outer.className = 'fly';
    outer.setAttribute('aria-hidden', 'true');
    outer.style.cssText = `left:${x0}px;top:${y0}px;--dx:${b.left + b.width / 2 - size / 2 - x0}px;--dy:${b.top + b.height / 2 - size / 2 - y0}px`;
    const dot = document.createElement('div');
    dot.className = `${src.className} fly-dot`;
    dot.innerHTML = src.innerHTML;
    dot.querySelectorAll('.fav-btn, .sold-flag').forEach((x) => x.remove());
    outer.appendChild(dot);
    document.body.appendChild(outer);
    let done = false;
    const land = () => { if (done) return; done = true; outer.remove(); bumpBar(); };
    dot.addEventListener('animationend', land, { once: true });
    setTimeout(land, 1200);   // на всякий случай: анимацию могли не показать
    return true;
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

  // сколько порций ещё можно добавить (ресторан ведёт остаток — больше, чем есть, сервер не примет)
  const room = (d) => (d?.stock == null ? 99 : d.stock - dishCount(d.id));
  function stockBlocked(d, add) {
    if (!d || d.stock == null || room(d) >= add) return false;
    toast(t('stockMax')(d.stock), 'bad');
    return true;
  }

  // возвращает true, если блюдо добавилось (для полёта в «Мой заказ»)
  function change(key, delta) {
    if (delta > 0 && !orderable(byId[parseKey(key).id])) return false;
    if (delta > 0 && stockBlocked(byId[parseKey(key).id], delta)) return false;
    const was = order[key] || 0;
    const n = Math.min(99, Math.max(0, (order[key] || 0) + delta));
    if (n) { order[key] = n; remember(key); } else { delete order[key]; delete seen[key]; store.set('seen', seen); if (dishNotes[key]) { delete dishNotes[key]; saveDishNotes(); } if (noteOpen === key) noteOpen = null; }
    priceChanges = priceChanges.filter((p) => order[p.key]);
    store.set('order', order);
    refreshSlots();
    renderBar();
    if (sheet?.type === 'order') renderSheet();
    return n > was;
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
    // строку можно смахнуть влево — под ней терракотовая кнопка «Удалить»
    out.push(`<ul class="order-list cart-list">${ls.map(({ key, id, n, d, ok, unit, names }) => `
      <li class="cart-line${ok ? '' : ' gone'}" data-line="${esc(key)}">
        <button type="button" class="swipe-del" data-act="swipe-del" data-key="${esc(key)}" tabindex="-1" aria-hidden="true">${icon('trash')}<span>${esc(t('del'))}</span></button>
        <div class="cl-row">
        ${photo(d)}
        <span class="o-name"><b>${esc(itemName(id))}</b>${names.length ? `<em class="o-opts">${esc(names.join(', '))}</em>` : ''}<small>${ok ? `${money(unit)} × ${n}` : esc(d?.available && !catOpen(catOf(d)) ? t('notNowRow')(clock(catOf(d).from), clock(catOf(d).to)) : t('soldOutRow'))}</small></span>
        <span class="o-sum">${ok ? money(unit * n) : ''}</span>
        <div class="o-ctl">${ok ? lineControl(key) : '<span></span>'}
          <button type="button" class="o-remove" data-act="del" data-key="${esc(key)}">${icon('trash', 'sm')}${esc(t('removeItem'))}</button></div>
        ${ok && ONLINE ? `<div class="o-dn">${dishNoteHtml(key)}</div>` : ''}
        </div>
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
        ${o.paid_at ? `<button type="button" class="btn" data-act="receipt" data-id="${esc(id)}">${icon('list', 'sm')}<span>${esc(t('receipt'))}</span></button>` : ''}
        ${gs !== 'cancelled' ? `<button type="button" class="btn soft" data-act="repeat" data-id="${esc(id)}">${icon('refresh', 'sm')}<span>${esc(t('repeat'))}</span></button>` : ''}
        <button type="button" class="btn ghost" data-act="more"><span>${esc(t('orderMore'))}</span></button>
      </div></div>`;
  }

  // ---------- Чек в телефоне ----------
  async function openReceipt(id) {
    const mine = myOrders.find((x) => x.id === id);
    if (!mine) return;
    openSheet({ type: 'receipt', id, data: undefined });
    let data = null;
    try { data = await rpc('guest_receipt', { p_order: id, p_token: mine.token }); } catch { data = 'error'; }
    if (sheet?.type === 'receipt' && sheet.id === id) { sheet.data = data; renderSheet(); }
  }
  function receiptHtml() {
    const back = `<button type="button" class="btn ghost" data-act="track" data-id="${esc(sheet.id)}">${esc(t('receiptBack'))}</button>`;
    const b = sheet.data;
    if (b === undefined) return `<h2 class="sheet-title" id="sheet-title">${esc(t('receipt'))}</h2><div class="state"><span class="spinner" aria-hidden="true"></span></div>`;
    if (b === 'error') return `<h2 class="sheet-title" id="sheet-title">${esc(t('receipt'))}</h2><p class="notice">${icon('alert')}<span>${esc(t('errServer'))}</span></p><div class="track-actions">${back}</div>`;
    if (!b) return `<h2 class="sheet-title" id="sheet-title">${esc(t('receipt'))}</h2><p class="notice info">${icon('clock')}<span>${esc(t('receiptWait'))}</span></p><div class="track-actions">${back}</div>`;
    const r = R();
    const num = (n) => new Intl.NumberFormat(t('locale'), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
    const cur = (n) => (r.currencyBefore ? `${r.currency} ${num(n)}` : `${num(n)} ${r.currency}`);
    const lines = new Map();
    for (const i of b.items || []) {
      const on = (i.opts || []).map((x) => L(x.name)).filter(Boolean);
      const k = `${i.id}|${on.join(',')}|${i.price}`;
      const l = lines.get(k) || { name: L(i.name) || i.id, on, price: Number(i.price), qty: 0 };
      l.qty += Number(i.qty);
      lines.set(k, l);
    }
    const n = (k) => Number(b[k]) || 0;
    const pctOf = (part, base) => { const p = base > 0 ? Math.round((part / base) * 1000) / 10 : 0; return p ? `${String(p).replace(/\.0$/, '')}%` : ''; };
    const taxBase = n('subtotal') - n('discount') + (r.taxOnService === false ? 0 : n('service'));
    const when = new Date(b.paid_at);
    const pays = (b.payments || []).length ? b.payments : [{ method: b.method, amount: n('total') + n('tip') + n('rounding') }];
    const row = (k, v, cls = '') => `<div class="rc-row${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b dir="ltr">${esc(v)}</b></div>`;
    const addr = L(r.address);
    return `<h2 class="sheet-title" id="sheet-title">${esc(t('receiptTitle')(b.no))}</h2>
      <article class="g-receipt" aria-label="${esc(t('receiptTitle')(b.no))}">
        <header class="rc-head"><b>${esc(r.name)}</b>${addr ? `<small>${esc(addr)}</small>` : ''}${r.phone ? `<small dir="ltr">${esc(r.phone)}</small>` : ''}${r.receiptInfo ? `<small class="rc-info">${esc(r.receiptInfo)}</small>` : ''}</header>
        <div class="rc-doc">${esc(t('receiptTitle')(b.no))}</div>
        <div class="rc-block">
          ${row(t('table'), b.table_label)}
          ${row(t('rcOrders'), (b.order_nos || []).map((x) => `№${x}`).join(', '))}
          ${row(t('rcDate'), `${when.toLocaleDateString(t('locale'), { day: '2-digit', month: '2-digit', year: 'numeric' })} ${when.toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' })}`)}
          ${(b.waiters || []).length ? row(t('rcWaiter'), b.waiters.join(', ')) : ''}
          ${b.cashier ? row(t('rcCashier'), b.cashier) : ''}
        </div>
        <ul class="rc-items">${[...lines.values()].map((l) => `<li><span><b>${esc(l.name)}</b>${l.on.length ? `<em>${esc(l.on.join(', '))}</em>` : ''}<small dir="ltr">${l.qty} × ${esc(num(l.price))}</small></span><b dir="ltr">${esc(num(l.price * l.qty))}</b></li>`).join('')}</ul>
        <div class="rc-block">
          ${row(t('subtotal'), num(n('subtotal')))}
          ${n('discount') ? row(`${t('rcDiscount')}${b.discount_pct ? ` ${Number(b.discount_pct)}%` : ''}`, `−${num(n('discount'))}`) : ''}
          ${n('service') ? row(t('service')(pctOf(n('service'), n('subtotal') - n('discount')).replace('%', '')), num(n('service'))) : ''}
          ${n('tax') ? row(`${r.taxName || 'SST'} ${pctOf(n('tax'), taxBase)}`.trim(), num(n('tax'))) : ''}
        </div>
        ${row(t('total'), cur(n('total')), 'rc-total')}
        ${n('rounding') ? `<div class="rc-block">${row(t('rcRounding'), `${n('rounding') > 0 ? '+' : '−'}${num(Math.abs(n('rounding')))}`)}${row(t('rcToPay'), cur(n('total') + n('rounding')))}</div>` : ''}
        <div class="rc-block">
          ${n('tip') ? row(t('rcTip'), num(n('tip'))) : ''}
          ${pays.map((p) => row(`${t('paid')}: ${t('rcPay')[p.method] || p.method}`, cur(p.amount))).join('')}
          ${pays.length > 1 || n('tip') ? row(t('rcPaidTotal'), cur(n('total') + n('tip') + n('rounding')), 'rc-strong') : ''}
        </div>
        <p class="rc-thanks">${esc(t('rcThanks'))}</p>
      </article>
      <div class="track-actions rc-actions">
        <button type="button" class="btn" data-act="receipt-print">${icon('download', 'sm')}<span>${esc(t('receiptSave'))}</span></button>
        ${back}
      </div>`;
  }
  function printReceiptPage() {
    const src = document.querySelector('.g-receipt');
    if (!src) return;
    // печатаем копию чека отдельно от шторки: на бумаге/в PDF только чек
    document.getElementById('print-root')?.remove();
    const root = document.createElement('div');
    root.id = 'print-root';
    root.appendChild(src.cloneNode(true));
    document.body.appendChild(root);
    document.body.classList.add('print-receipt');
    const off = () => { document.body.classList.remove('print-receipt'); root.remove(); removeEventListener('afterprint', off); };
    addEventListener('afterprint', off);
    try { window.print(); } catch { off(); }
    setTimeout(off, 60000);
  }
  async function copyText(v, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(v); ok = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = v; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    if (ok) {
      toast(t('copied'), 'good');
      if (btn) { const was = btn.textContent; btn.textContent = t('copied'); setTimeout(() => { btn.textContent = was; }, 1500); }
    }
  }

  // ---------- Отзыв и «Повторить заказ» ----------
  let reviewed = store.get('reviewed', {}) || {};
  let reviewDraft = { rating: 0, text: '' };
  let reviewBusy = false;
  // оценки блюд гостя: { заказ: { блюдо: 1 | -1 } } — помним, чтобы кнопки оставались выбранными
  let dishVotes = store.get('votes', {}) || {};
  // анимации отзыва играют только по действию гостя и один раз — перерисовка статуса их не повторяет
  const starsIntro = new Set();   // у каких заказов звёзды уже «пробежали» при появлении
  let starsLit = false;           // гость только что поставил оценку
  let thanksFor = null;           // отзыв только что ушёл — «спасибо» появляется мягко
  function reviewHtml(id, o) {
    if (!ONLINE || (!['served', 'ready', 'cooking'].includes(o.status) && !o.paid_at)) return '';
    if (reviewed[id]) {
      const fresh = thanksFor === id ? ' thanks-in' : '';
      thanksFor = null;
      const g = R().googleReviewUrl;
      if (g && reviewed[id] >= 4) {
        return `<section class="review google-ask${fresh}"><p>${esc(t('googleAsk'))}</p>
          <a class="btn block" href="${esc(g)}" target="_blank" rel="noopener">${icon('star', 'sm')}<span>${esc(t('googleBtn'))}</span></a></section>`;
      }
      return `<p class="notice ok${fresh}">${icon('check')}<span>${esc(t('rateThanks'))}</span></p>`;
    }
    const r = reviewDraft.rating;
    const anim = starsLit ? ' lit' : starsIntro.has(id) ? '' : ' intro';
    starsLit = false;
    starsIntro.add(id);
    return `<section class="review" aria-labelledby="rv-t"><h4 id="rv-t">${esc(t('rateTitle'))}</h4>
      <div class="stars${anim}" role="radiogroup" aria-label="${esc(t('rateTitle'))}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star${n <= r ? ' on' : ''}" style="--i:${n - 1}" data-act="rate" data-n="${n}" role="radio" aria-checked="${n === r}" aria-label="${esc(t('rateStar')(n))}"><svg class="ic" aria-hidden="true"><use href="#i-star"/></svg></button>`).join('')}</div>
      ${r ? votesHtml(id, o) : ''}
      ${r ? `<textarea id="review-text" rows="2" maxlength="500" placeholder="${esc(t('ratePh'))}">${esc(reviewDraft.text)}</textarea>
        <button type="button" class="btn block" data-act="review-send" data-id="${esc(id)}"${reviewBusy ? ' disabled' : ''}>${esc(t('rateSend'))}</button>` : ''}
    </section>`;
  }
  // блюда заказа (без повторов) с «понравилось / не понравилось»
  function votesHtml(id, o) {
    const ids = new Set();
    const list = (o.items || []).filter((i) => i.id && !ids.has(i.id) && ids.add(i.id));
    if (!list.length) return '';
    const v = dishVotes[id] || {};
    const btn = (i, n, kind, label) => `<button type="button" class="vote ${kind}${v[i.id] === n ? ' on' : ''}" data-act="vote" data-id="${esc(id)}" data-dish="${esc(i.id)}" data-vote="${n}" aria-pressed="${v[i.id] === n}" aria-label="${esc(`${t(label)}: ${L(i.name) || i.id}`)}">${icon(`thumb-${kind}`)}</button>`;
    return `<div class="votes"><p class="votes-t">${esc(t('voteTitle'))}</p><ul class="vote-list">${list.map((i) => `
      <li><span class="grow">${esc(L(i.name) || i.id)}</span>${btn(i, 1, 'up', 'voteUp')}${btn(i, -1, 'down', 'voteDown')}</li>`).join('')}</ul></div>`;
  }
  // нажали ещё раз на выбранное — оценка снимается; меняем кнопки на месте, без перерисовки шторки
  function vote(btn) {
    const { id, dish } = btn.dataset;
    const n = Number(btn.dataset.vote);
    const m = dishVotes[id] || (dishVotes[id] = {});
    if (m[dish] === n) delete m[dish]; else m[dish] = n;
    store.set('votes', dishVotes);
    btn.closest('li')?.querySelectorAll('.vote').forEach((b) => {
      const on = m[dish] === Number(b.dataset.vote);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  async function sendReview(id) {
    const mine = myOrders.find((x) => x.id === id);
    if (!mine || !reviewDraft.rating || reviewBusy) return;
    reviewBusy = true;
    renderSheet();
    try {
      // оценки блюд — вместе с отзывом (повторная отправка безопасна: сервер перезаписывает)
      const votes = Object.fromEntries(Object.entries(dishVotes[id] || {}).filter(([, v]) => v === 1 || v === -1));
      if (Object.keys(votes).length) {
        try { await rpc('vote_dishes', { p_order: id, p_token: mine.token, p_votes: votes }); } catch (e) { if (e?.net) throw e; /* отзыв важнее оценок блюд */ }
      }
      await rpc('leave_review', { p_order: id, p_token: mine.token, p_rating: reviewDraft.rating, p_comment: reviewDraft.text.trim() || null, p_lang: lang });
      reviewed[id] = reviewDraft.rating;
      store.set('reviewed', reviewed);
      reviewDraft = { rating: 0, text: '' };
      thanksFor = id;
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
      // остаток меньше, чем было в заказе: берём сколько есть
      const q = Math.min(Number(i.qty), room(d));
      if (q <= 0) { skipped += 1; continue; }
      if (q < Number(i.qty)) skipped += 1;
      const key = makeKey(d.id, opts);
      order[key] = Math.min(99, (order[key] || 0) + q);
      remember(key);
      if (i.note && !dishNotes[key]) dishNotes[key] = String(i.note).slice(0, 120);
      added += q;
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
    if (stockBlocked(d, sheet.pick.qty)) return;
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
    // сразу после успешного вызова кнопка на пару секунд становится галочкой «Официант уже идёт» / «Счёт несут»
    const just = (k) => callJust?.kind === k && Date.now() < callJust.until;
    const morph = (k) => { if (!just(k) || callJust.played) return ''; callJust.played = true; return ' morph'; };
    el.innerHTML = `<button type="button" class="call-btn${openCalls.waiter ? ' on' : ''}${just('waiter') ? ' just' : ''}${morph('waiter')}" data-act="call-waiter"${calling ? ' disabled' : ''}>${icon(openCalls.waiter ? 'check' : 'bell')}<span>${esc(just('waiter') ? t('callDone') : openCalls.waiter ? t('waiterComing') : t('callWaiter'))}</span></button>
      <button type="button" class="call-btn${openCalls.bill ? ' on' : ''}${just('bill') ? ' just' : ''}${morph('bill')}" data-act="call-bill"${calling ? ' disabled' : ''}>${icon(openCalls.bill ? 'check' : 'list')}<span>${esc(just('bill') ? t('billDone') : openCalls.bill ? t('billComing') : t('askBill'))}</span></button>`;
  }
  let callJust = null;   // { kind, until, played } — короткое «подтверждение» после вызова
  async function callStaff(kind, method, reason) {
    if (calling || !ONLINE || !tableToken) return;
    calling = true;
    renderTableActions();
    try {
      await rpc('call_staff', { p_table: tableToken, p_kind: kind, p_method: method || null, p_reason: reason || null });
      openCalls[kind] = true;
      callJust = { kind, until: Date.now() + 3000, played: false };
      setTimeout(() => { if (callJust && Date.now() >= callJust.until) { callJust = null; renderTableActions(); } }, 3050);
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
      <figure class="v-in"><img src="${esc(d.photo)}" alt="${esc(L(d.name))}"><figcaption><b>${esc(L(d.name))}</b><span>${money(priceOf(d))}</span>${many ? `<small>${esc(t('photoOf')(viewer.i + 1, viewer.ids.length))}</small>` : ''}</figcaption></figure>
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
      else if (/sold_out/.test(m)) {
        // порций осталось меньше, чем в заказе: свежее меню и точная подсказка, сколько осталось
        await refreshMenu(true);
        const d = byId[(m.match(/sold_out:([^\s"]+)/) || [])[1]];
        sendError = d && d.stock > 0 ? t('errStockLeft')(L(d.name), d.stock) : t('errChanged');
      } else if (/price_changed|unavailable|options|not_now/.test(m)) { await refreshMenu(true); sendError = t('errChanged'); }
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
        wifi = row.wifi_name ? { name: row.wifi_name, pass: row.wifi_pass || '' } : null;
        tableState = 'ok';
        store.set('table', { token: tableToken, at: Date.now(), label: table });
        pollCalls().then(scheduleCalls);
      } else {
        table = '';
        wifi = null;
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

  // ---------- Бронь стола ----------
  // На телефоне — только номер брони, её секрет и последний известный статус; правду знает сервер.
  let booking = (() => { const b = store.get('booking', null); return b && b.id && b.token ? b : null; })();
  const bkForm = { day: null, time: null, people: 2, name: '', phone: '', note: '', busy: false, error: '', key: null, sig: '', ask: false };
  { const c = store.get('bookingContact', null); if (c) { bkForm.name = String(c.name || '').slice(0, 60); bkForm.phone = String(c.phone || '').slice(0, 20); } }
  let bkTimer = null;
  const pad2 = (n) => String(n).padStart(2, '0');
  const bkActive = () => !!booking && ['new', 'confirmed'].includes(booking.status) && new Date(booking.at).getTime() > Date.now();

  // смещение часового пояса ресторана в момент ms (как сервер считает «at time zone»)
  let tzFmt = null;   // один форматтер на часовой пояс: создавать его на каждый слот дорого
  function tzOffset(ms) {
    try {
      if (tzFmt?.zone !== R().timezone) {
        tzFmt = { zone: R().timezone, f: new Intl.DateTimeFormat('en-US', { timeZone: R().timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) };
      }
      const p = Object.fromEntries(tzFmt.f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(ms / 60000) * 60000;
    } catch { return -new Date(ms).getTimezoneOffset() * 60000; }
  }
  // день (полночь UTC с датой ресторана) + минуты по часам ресторана → настоящий момент
  function zoned(dayUtc, min) {
    const guess = dayUtc + min * 60000;
    let at = guess - tzOffset(guess);
    at = guess - tzOffset(at);   // переход на летнее время (в Малайзии его нет, но пусть будет верно везде)
    return at;
  }
  // открыт ли ресторан в этот день недели и минуту — та же логика, что restaurant_open на сервере
  function openAt(wd, m) {
    const s = R().schedule;
    if (!Array.isArray(s) || s.length !== 7) return false;
    const p = s[(wd + 6) % 7];
    if (p && !p.closed && SCH.mins(p.close) < SCH.mins(p.open) && m < SCH.mins(p.close)) return true;
    const d = s[wd];
    if (!d || d.closed) return false;
    const o = SCH.mins(d.open);
    const c = SCH.mins(d.close);
    return c > o ? m >= o && m < c : m >= o;
  }
  // 14 дней вперёд; время — каждые 30 минут, когда ресторан открыт и не раньше чем через 30 минут
  function bkDays() {
    let today;
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: R().timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date()).map((x) => [x.type, x.value]));
      today = Date.UTC(+p.year, +p.month - 1, +p.day);
    } catch { const n = new Date(); today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); }
    const soon = Date.now() + 31 * 60000;   // минута запаса: сервер требует не меньше 30 минут
    const out = [];
    for (let k = 0; k < 14; k++) {
      const day = today + k * 86400000;
      const u = new Date(day);
      const wd = (u.getUTCDay() + 6) % 7;
      const slots = [];
      for (let m = 0; m < 1440; m += 30) {
        if (!openAt(wd, m)) continue;
        const at = zoned(day, m);
        if (at >= soon) slots.push({ m, iso: new Date(at).toISOString() });
      }
      out.push({ key: `${u.getUTCFullYear()}-${pad2(u.getUTCMonth() + 1)}-${pad2(u.getUTCDate())}`, k, u, wd, slots });
    }
    return out;
  }
  // «сб, 22 нояб., 19:30» — по часам ресторана
  function bkWhen(iso) {
    const d = new Date(iso);
    try {
      const day = new Intl.DateTimeFormat(t('locale'), { weekday: 'short', day: 'numeric', month: 'short', timeZone: R().timezone }).format(d);
      const time = new Intl.DateTimeFormat(t('locale'), { hour: '2-digit', minute: '2-digit', hour12: lang === 'en', timeZone: R().timezone }).format(d);
      return `${day}, ${time}`;
    } catch { return d.toLocaleString(); }
  }

  function bookingHtml() {
    const title = `<h2 class="sheet-title" id="sheet-title">${esc(t('bkTitle'))}</h2>`;
    if (booking) return title + bookingCardHtml();
    if (!R().bookingsEnabled) return `${title}<p class="notice">${icon('alert')}<span>${esc(t('bkErr').bookings_off)}</span></p>`;
    const f = bkForm;
    const days = bkDays();
    if (!days.some((d) => d.key === f.day && d.slots.length)) f.day = days.find((d) => d.slots.length)?.key || null;
    const day = days.find((d) => d.key === f.day);
    if (f.time && !day?.slots.some((x) => x.iso === f.time)) f.time = null;
    const fmt = (o) => { try { return new Intl.DateTimeFormat(t('locale'), { ...o, timeZone: 'UTC' }); } catch { return new Intl.DateTimeFormat('en', { ...o, timeZone: 'UTC' }); } };
    const wdF = fmt({ weekday: 'short' });
    const dF = fmt({ day: 'numeric', month: 'short' });
    const dayChips = days.map((d) => `<button type="button" class="bk-chip bk-day${d.key === f.day ? ' on' : ''}" data-act="bk-day" data-day="${d.key}" aria-pressed="${d.key === f.day}"${d.slots.length ? '' : ' disabled'}>
        <small>${esc(d.k === 0 ? t('today') : wdF.format(d.u))}</small><b>${esc(dF.format(d.u))}</b>${d.slots.length ? '' : `<small>${esc(t('bkDayOff'))}</small>`}</button>`).join('');
    const times = day?.slots.length
      ? `<div class="bk-times">${day.slots.map((x) => `<button type="button" class="bk-chip bk-time${x.iso === f.time ? ' on' : ''}" data-act="bk-time" data-at="${x.iso}" aria-pressed="${x.iso === f.time}"><bdi dir="ltr">${esc(clock(`${pad2(Math.floor(x.m / 60))}:${pad2(x.m % 60)}`))}</bdi></button>`).join('')}</div>`
      : `<p class="hint-note">${esc(t('bkNoTimes'))}</p>`;
    return `${title}
      <h4>${esc(t('bkDate'))}</h4><div class="bk-days">${dayChips}</div>
      <h4>${esc(t('bkTime'))}</h4>${times}
      <div class="bk-people"><span>${esc(t('bkPeople'))}</span>
        <div class="stepper"><button type="button" data-act="bk-people" data-d="-1" aria-label="${esc(`${t('bkPeople')} −1`)}"${f.people <= 1 ? ' disabled' : ''}>${icon('minus')}</button><span aria-live="polite">${f.people}</span><button type="button" data-act="bk-people" data-d="1" aria-label="${esc(`${t('bkPeople')} +1`)}"${f.people >= 20 ? ' disabled' : ''}>${icon('plus')}</button></div></div>
      <label class="bk-field"><span>${esc(t('bkName'))}</span><input id="bk-name" autocomplete="name" maxlength="60" value="${esc(f.name)}"></label>
      <label class="bk-field"><span>${esc(t('bkPhone'))}</span><input id="bk-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" placeholder="${esc(t('bkPhonePh'))}" value="${esc(f.phone)}"></label>
      <label class="bk-field"><span>${esc(t('bkNote'))}</span><textarea id="bk-note" rows="2" maxlength="300" placeholder="${esc(t('bkNotePh'))}">${esc(f.note)}</textarea></label>
      <div class="sheet-actions">
        ${f.error ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(f.error)}</span></p>` : ''}
        <button type="button" class="btn block send-btn bk-send" data-act="bk-send"${f.busy ? ' disabled' : ''}>${f.busy ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('sending'))}</span>` : `<span>${esc(t('bkSend'))}</span>`}</button>
      </div>`;
  }

  // карточка брони: «Бронь №101 · сб, 22 нояб., 19:30 · 4 гостя» и статус
  function bookingCardHtml() {
    const b = booking;
    const st = b.status || 'new';
    const stText = st === 'confirmed' && b.table_label ? `${t('bkStatus').confirmed}, ${t('bkTable')(b.table_label)}` : (t('bkStatus')[st] || st);
    const kind = st === 'cancelled' || st === 'no_show' ? 'off' : st === 'new' ? 'wait' : 'ok';
    const canCancel = bkActive();
    const f = bkForm;
    const actions = canCancel
      ? (f.ask
        ? `<p class="bk-ask">${esc(t('bkCancelAsk')(b.no))}</p><div class="btn-pair">
            <button type="button" class="btn ghost" data-act="bk-cancel-no"${f.busy ? ' disabled' : ''}>${esc(t('bkCancelNo'))}</button>
            <button type="button" class="btn soft" data-act="bk-cancel-yes"${f.busy ? ' disabled' : ''}>${f.busy ? '<span class="spinner" aria-hidden="true"></span>' : ''}<span>${esc(t('bkCancelYes'))}</span></button></div>`
        : `<button type="button" class="btn ghost" data-act="bk-cancel">${esc(t('bkCancel'))}</button>`)
      : `<button type="button" class="btn" data-act="bk-new">${esc(t('bkNew'))}</button>`;
    return `<div class="bk-card is-${kind}" aria-live="polite">
        <span class="bk-icon">${icon(kind === 'ok' ? 'check' : kind === 'off' ? 'x' : 'clock')}</span>
        <div><b>${esc(stText)}</b><span>${esc([t('bkNo')(b.no), bkWhen(b.at), t('bkGuests')(b.people)].join(' · '))}</span></div>
      </div>
      ${st === 'new' && canCancel ? `<p class="hint-note">${esc(t('bkWait'))}</p>` : ''}
      ${f.error ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(f.error)}</span></p>` : ''}
      <div class="bk-actions">${actions}</div>`;
  }

  function openBooking() {
    bkForm.error = '';
    bkForm.ask = false;
    openSheet({ type: 'booking' });
    pollBooking();
    scheduleBooking();
  }
  async function sendBooking() {
    const f = bkForm;
    if (f.busy) return;
    const name = f.name.trim();
    const phone = f.phone.trim().replace(/\s+/g, ' ');
    f.error = !f.time ? t('bkNeedTime') : !name ? t('bkNeedName') : !/^\+?[0-9][0-9 ()-]{5,19}$/.test(phone) ? t('bkNeedPhone') : '';
    if (!f.error && new Date(f.time).getTime() < Date.now() + 30 * 60000) { f.time = null; f.error = t('bkErr').bad_time; }
    if (f.error) { renderSheet(); return; }
    // один ключ на одну попытку: повторное нажатие и потерянный ответ не создадут вторую бронь
    const sig = JSON.stringify([name, phone, f.time, f.people, f.note.trim()]);
    if (!f.key || f.sig !== sig) { f.key = uuid(); f.sig = sig; }
    f.busy = true;
    renderSheet();
    try {
      const rows = await rpc('book_table', { p_name: name, p_phone: phone, p_at: f.time, p_people: f.people, p_note: f.note.trim() || null, p_lang: lang, p_client_key: f.key });
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (!r?.id || !r.guest_token) throw new Error('bad_reply');
      booking = { id: r.id, token: r.guest_token, no: r.no, at: r.at, people: r.people, status: r.status || 'new', table_label: null };
      store.set('booking', booking);
      store.set('bookingContact', { name, phone });
      Object.assign(f, { time: null, note: '', key: null, sig: '', error: '', ask: false });
      toast(t('bkSent'), 'good');
      scheduleBooking();
    } catch (e) {
      const m = String(e?.message || '');
      const code = e?.net ? '' : Object.keys(t('bkErr')).find((k) => m.includes(k));
      f.error = code ? t('bkErr')[code] : t('bkNet');
      if (code === 'bad_time' || code === 'closed_then') f.time = null;
      if (code === 'bookings_off') M.restaurant.bookingsEnabled = false;
    } finally {
      f.busy = false;
      renderHeader();
      if (sheet?.type === 'booking') renderSheet();
    }
  }
  async function cancelBooking() {
    if (!booking || bkForm.busy) return;
    bkForm.busy = true;
    bkForm.error = '';
    renderSheet();
    try {
      await rpc('cancel_booking', { p_id: booking.id, p_token: booking.token });
      booking = { ...booking, status: 'cancelled' };
      store.set('booking', booking);
      toast(t('bkCancelled'), 'good');
    } catch (e) {
      if (e?.net) bkForm.error = t('bkNet'); else await pollBooking();   // уже не отменить (посадили, прошло) — покажем, как есть
    } finally {
      bkForm.busy = false;
      bkForm.ask = false;
      renderHeader();
      if (sheet?.type === 'booking') renderSheet();
    }
  }
  // статус спрашиваем, когда шторка брони открыта (раз в 20 с) и когда гость вернулся на страницу
  async function pollBooking() {
    if (!ONLINE || !booking) return;
    const was = booking;
    try {
      const rows = await rpc('my_booking', { p_id: was.id, p_token: was.token });
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (booking !== was) return;   // пока ждали ответа, гость отменил или начал новую бронь
      if (!r) {
        booking = null;               // день брони прошёл — сервер её больше не отдаёт
      } else {
        const next = { ...was, no: r.no, status: r.status, at: r.at, people: r.people, table_label: r.table_label || null };
        if (JSON.stringify(next) === JSON.stringify(was)) return;
        booking = next;
      }
      store.set('booking', booking);
      renderHeader();
      if (sheet?.type === 'booking' && !bkForm.busy) renderSheet();
    } catch { /* нет связи — показываем последний известный статус */ }
  }
  function scheduleBooking() {
    clearTimeout(bkTimer);
    if (sheet?.type !== 'booking' || !booking) return;
    bkTimer = setTimeout(async () => { if (!document.hidden) await pollBooking(); scheduleBooking(); }, 20000);
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
        ${photo(d, 'big', true, favBtn(d.id))}
        ${tagsHtml(d)}
        <h2 class="sheet-title" id="sheet-title">${esc(L(d.name))}</h2>
        ${L(d.desc) ? `<p class="sheet-desc">${esc(L(d.desc))}</p>` : ''}
        ${d.available ? '' : `<p class="notice bad">${icon('alert')}<span>${esc(t('soldOut'))}</span></p>`}
        ${meatText(d) ? `<h4>${esc(t('meatLabel'))}</h4><p class="meat-line">${esc(meatText(d))}</p>` : ''}
        ${L(d.ingredients) ? `<h4>${esc(t('ingredients'))}</h4><p>${esc(L(d.ingredients))}</p>` : ''}
        ${allergens ? `<h4>${esc(t('allergens'))}</h4><p>${esc(allergens)}</p>` : ''}
        ${pick ? `<p class="pick-price">${priceHtml(d, 'big')}<span class="amount">${esc(meta)}</span></p>${optsHtml}
        <div class="sheet-foot pick-foot">
          <div class="stepper"><button type="button" data-act="pick-dec" aria-label="${esc(t('remove'))}">${icon('minus')}</button><span id="pick-qty" aria-live="polite">${sheet.pick.qty}</span><button type="button" data-act="pick-inc" aria-label="${esc(t('add'))}">${icon('plus')}</button></div>
          <button type="button" class="btn pick-add" id="pick-add" data-act="pick-add"${oi.ok ? '' : ' disabled'}><span>${esc(t('addFor')(money(oi.unit * sheet.pick.qty)))}</span></button>
        </div>` : `
        <div class="sheet-foot">
          <div class="price-wrap">${priceHtml(d, 'big')}<span class="amount">${esc(meta)}</span></div>
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

    if (sheet.type === 'wifi') {
      if (!wifi) { body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('wifi'))}</h2>`; return; }
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('wifi'))}</h2>
        <div class="wifi-card">
          <div class="wifi-row"><span>${esc(t('wifiNet'))}</span><b dir="ltr">${esc(wifi.name)}</b><button type="button" class="btn small soft" data-act="copy" data-v="${esc(wifi.name)}">${esc(t('copy'))}</button></div>
          <div class="wifi-row"><span>${esc(t('wifiPass'))}</span>${wifi.pass ? `<b dir="ltr" class="wifi-pass">${esc(wifi.pass)}</b><button type="button" class="btn small" data-act="copy" data-v="${esc(wifi.pass)}">${esc(t('copy'))}</button>` : `<b>${esc(t('wifiNoPass'))}</b>`}</div>
        </div>
        <p class="hint-note">${esc(t('wifiHint'))}</p>`;
      return;
    }
    if (sheet.type === 'receipt') { body.innerHTML = receiptHtml(); return; }
    if (sheet.type === 'track') { body.innerHTML = trackSheetHtml(sheet.id); return; }
    if (sheet.type === 'booking') {
      // ряд дней прокручивается вбок — после перерисовки остаётся на месте
      const sl = body.querySelector('.bk-days')?.scrollLeft || 0;
      body.innerHTML = bookingHtml();
      const row = body.querySelector('.bk-days');
      if (row) row.scrollLeft = sl;
      return;
    }
    body.innerHTML = orderSheetHtml();
    roll('sheet', [...body.querySelectorAll('.order-total strong, .send-sum bdi')], charges(totals().sum).total);
  }

  function openSheet(next) {
    const wasOpen = !!sheet;
    if (next.type !== sheet?.type) delete rolls.sheet;   // открыли заново — сумма сразу точная, без докрутки
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
    delete rolls.sheet;
    clearTimeout(bkTimer);
    const el = $('#sheet');
    const bd = $('#backdrop');
    el.classList.remove('open');
    bd.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { if (!sheet) { el.hidden = true; bd.hidden = true; } }, 300);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  let hSwipe = false;   // сейчас смахивают строку списка вбок
  // смахнуть шторку вниз — закрыть (на телефоне): тянем за верх или когда список уже вверху
  {
    const el = $('#sheet');
    let y0 = null; let x0 = 0; let dy = 0; let t0 = 0; let dragging = false;
    const phone = () => matchMedia('(max-width: 719.98px)').matches;
    el.addEventListener('touchstart', (e) => {
      if (!sheet || !phone() || e.touches.length !== 1) return;
      const onGrab = e.target.closest('.sheet-grab') || e.touches[0].clientY - el.getBoundingClientRect().top < 56;
      if (!onGrab && el.scrollTop > 0) return;
      if (e.target.closest('input, textarea, select, .hits-row, .stepper')) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; t0 = Date.now(); dragging = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      if (hSwipe) { y0 = null; return; }   // строку списка смахивают вбок — шторку не трогаем
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 8 && Math.abs(e.touches[0].clientX - x0) < dy && el.scrollTop <= 0) { dragging = true; el.classList.add('dragging'); }
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

  // смахнуть строку списка влево (в арабском — вправо): открыть «Удалить»; до конца — сразу удалить
  {
    const el = $('#sheet');
    const ACTION = 96;          // ширина открытой кнопки
    const rtl = () => t('dir') === 'rtl';
    const setOff = (row, off) => { row.style.transform = off ? `translateX(${rtl() ? off : -off}px)` : ''; };
    let s = null;               // текущее касание
    let openRow = null;         // строка, у которой открыта кнопка
    const shut = (except) => {
      if (openRow && openRow !== except) { setOff(openRow, 0); openRow.closest('.cart-line')?.classList.remove('open'); openRow = null; }
    };
    el.addEventListener('touchstart', (e) => {
      s = null;
      const row = e.target.closest('.cart-line:not(.removing) > .cl-row');
      if (!row) { if (!e.target.closest('.swipe-del')) shut(); return; }
      shut(row);
      if (e.touches.length !== 1 || e.target.closest('input, textarea')) return;
      s = { row, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dir: '', w: row.offsetWidth, base: row === openRow ? ACTION : 0, off: 0 };
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!s) return;
      const dx = e.touches[0].clientX - s.x0;
      const dy = e.touches[0].clientY - s.y0;
      if (!s.dir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // что хотел человек: вбок — смахнуть строку, вниз/вверх — листать или закрыть шторку
        s.dir = Math.abs(dx) > Math.abs(dy) && !el.classList.contains('dragging') ? 'h' : 'v';
        if (s.dir === 'h') { hSwipe = true; s.row.classList.add('dragging'); }
      }
      if (s.dir !== 'h') return;
      e.preventDefault();
      s.off = Math.max(0, Math.min(s.w, (rtl() ? dx : -dx) + s.base));
      setOff(s.row, s.off);
    }, { passive: false });
    const end = () => {
      const st = s;
      s = null;
      hSwipe = false;
      if (!st || st.dir !== 'h') return;
      st.row.classList.remove('dragging');
      const li = st.row.closest('.cart-line');
      if (st.off > st.w * 0.5) { removeLine(li?.dataset.line, li); return; }
      if (st.off > ACTION * 0.6) { setOff(st.row, ACTION); openRow = st.row; li?.classList.add('open'); return; }
      setOff(st.row, 0);
      li?.classList.remove('open');
      if (openRow === st.row) openRow = null;
    };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  }
  // строка уезжает и схлопывается, потом убираем её из списка
  function removeLine(key, li) {
    const n = order[key] || 0;
    if (!n) return;
    if (!li || reduced() || li.classList.contains('removing')) { if (!li?.classList.contains('removing')) change(key, -n); return; }
    const row = li.querySelector('.cl-row');
    li.style.height = `${li.offsetHeight}px`;
    li.classList.add('removing');
    if (row) row.style.transform = `translateX(${t('dir') === 'rtl' ? '' : '-'}100%)`;
    void li.offsetHeight;
    li.style.height = '0px';
    let done = false;
    const fin = () => { if (done) return; done = true; change(key, -(order[key] || 0)); };
    li.addEventListener('transitionend', (e) => { if (e.target === li && e.propertyName === 'height') fin(); });
    setTimeout(fin, 450);
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

  // Список гостя против текущего меню: что пропало (не было в goneBefore), где изменилась цена
  function reconcile(goneBefore) {
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
    return changed;
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

    const changed = reconcile(goneBefore);
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
      if (a === 'inc') {
        // «+» на карточке меню: фото летит в «Мой заказ» (не из шторки и не из строки списка)
        const src = !sheet && !act.dataset.key && !reduced() ? act.closest('[data-open]')?.querySelector('.photo') : null;
        flyHold = !!src;
        const added = change(k, 1);
        const held = flyHold;
        flyHold = false;
        if (added && held && !flyToBar(src)) bumpBar();
      } else if (a === 'dec') change(k, -1);
      else if (a === 'fav') toggleFav(act.dataset.id, act);
      else if (a === 'swipe-del') removeLine(k, act.closest('.cart-line'));
      else if (a === 'vote') vote(act);
      else if (a === 'booking') openBooking();
      else if (a === 'bk-day') { bkForm.day = act.dataset.day; bkForm.time = null; bkForm.error = ''; renderSheet(); }
      else if (a === 'bk-time') { bkForm.time = act.dataset.at; bkForm.error = ''; renderSheet(); }
      else if (a === 'bk-people') { bkForm.people = Math.min(20, Math.max(1, bkForm.people + Number(act.dataset.d))); renderSheet(); }
      else if (a === 'bk-send') sendBooking();
      else if (a === 'bk-cancel') { bkForm.ask = true; bkForm.error = ''; renderSheet(); }
      else if (a === 'bk-cancel-no') { bkForm.ask = false; renderSheet(); }
      else if (a === 'bk-cancel-yes') cancelBooking();
      else if (a === 'bk-new') { booking = null; store.set('booking', null); bkForm.error = ''; renderHeader(); renderSheet(); }
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
      else if (a === 'rate') { reviewDraft.rating = Number(act.dataset.n); starsLit = true; renderSheet(); }
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
      } else if (a === 'receipt') {
        openReceipt(act.dataset.id);
      } else if (a === 'receipt-print') {
        printReceiptPage();
      } else if (a === 'copy') {
        copyText(act.dataset.v || '', act);
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
    if (e.target.id === 'bk-name') bkForm.name = e.target.value.slice(0, 60);
    if (e.target.id === 'bk-phone') bkForm.phone = e.target.value.slice(0, 20);
    if (e.target.id === 'bk-note') bkForm.note = e.target.value.slice(0, 300);
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
    if (timeSig() !== lastOpenSig) {
      // акция закончилась или началась — цены в списке гостя тоже другие
      if (reconcile(new Set(lines().filter((l) => !l.ok).map((l) => l.key)))) { attention = sheet?.type !== 'order'; toast(t('listUpdated')); }
      renderMenu(); refreshSlots(); renderBar();
      if (sheet?.type === 'order' || sheet?.type === 'dish') renderSheet();
    }
  }, 60 * 1000);
  renderFilterBtn();
  if (ONLINE) {
    refreshMenu();
    setTimeout(loadStats, 1200);
    checkTable();
    pollOrders().then(() => schedulePoll());
    setInterval(() => { if (!document.hidden) refreshMenu(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshMenu(); pollBooking(); } });
    pollBooking();
    window.addEventListener('online', () => refreshMenu());
  }
})();
