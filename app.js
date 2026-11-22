(() => {
  'use strict';

  // =====================================================================
  //  Приложение гостя. Вкладки: #home #menu #orders #profile,
  //  подстраницы: #booking #delivery #scan #track/<id>.
  //  Режимы: за столом (QR, помним 4 часа со сканирования) — заказ на стол;
  //  доставка (точка на карте, цена по зонам ресторана); просто смотрим меню.
  //  Вид — по макету владельца design/preview.html, стили в guest.css.
  // =====================================================================

  // ---------- Тексты интерфейса на 6 языках ----------
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
      svcBtn: 'Сервис', callWaiter: 'Позвать официанта', askBill: 'Попросить счёт', waiterComing: 'Официант уже идёт', billComing: 'Счёт уже несут',
      callSent: 'Официант получил сигнал и скоро подойдёт.', billSent: 'Официант принесёт счёт.', callErr: 'Не получилось отправить сигнал. Позовите официанта рукой или попробуйте ещё раз.',
      payHow: 'Как будете платить?', payCash: 'Наличными', payCard: 'Картой', payQr: 'По QR-коду',
      subtotal: 'Блюда', service: (p) => `Сервисный сбор${p ? ` ${p}%` : ''}`, paid: 'Оплачено',
      required: 'обязательно', optional: 'по желанию', addFor: (s) => `Добавить · ${s}`, chooseOptions: 'Выбрать вариант',
      edited: (x) => `Ресторан изменил заказ в ${x}`,
      wifi: 'Wi‑Fi', wifiNet: 'Сеть', wifiPass: 'Пароль', wifiNoPass: 'Без пароля', wifiHint: 'Подключитесь в настройках телефона: Wi‑Fi → эта сеть → пароль.', copy: 'Скопировать', copied: 'Скопировано',
      receipt: 'Чек', receiptTitle: (n) => `Чек №${n}`, receiptSave: 'Сохранить или распечатать', receiptWait: 'Чек появится здесь, когда официант закроет счёт.', receiptBack: 'К заказу',
      rcDate: 'Дата', rcWaiter: 'Официант', rcCashier: 'Кассир', rcOrders: 'Заказы', rcDiscount: 'Скидка', rcRounding: 'Округление', rcToPay: 'К оплате', rcTip: 'Чаевые', rcPaidTotal: 'Всего оплачено', rcThanks: 'Спасибо, что были у нас!', rcVerifyCode: 'Код проверки', rcVerifyAt: 'Проверить',
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
      // ---------- приложение: вкладки, главная, режимы, сканер, доставка, профиль ----------
      tabHome: 'Главная', tabMenu: 'Меню', tabOrders: 'Заказы', tabProfile: 'Профиль', back: 'Назад',
      howEat: 'Как будем есть?', wayHere: 'Я в ресторане', wayHereSub: 'Наведите камеру на QR-код на столе', wayHereAt: (x) => `Стол ${x} — открыть меню`,
      wayDelivery: 'Доставка', wayDeliverySub: 'Привезём домой', waySoon: 'Скоро', wayBookSub: 'Выберите день и время',
      recommend: 'Сегодня советуем', allMenu: 'Всё меню',
      modeTable: (x) => `Стол ${x} · вы в ресторане`, modeTableSub: 'Заказ придёт прямо на стол', modeChange: 'Сменить', modeExit: 'Выйти',
      modeDv: 'Доставка', modeDvKm: (km, fee) => `Доставка · ${km} км · ${fee}`, modeDvSub: 'Адрес и стоимость — при оформлении', modeEdit: 'Изменить',
      modeBrowse: 'Меню для просмотра', modeBrowseSub: 'Заказать можно за столом или с доставкой', modeChoose: 'Выбрать',
      howTitle: 'Как будете заказывать?', howHint: 'Блюдо добавится, как только вы выберете способ.',
      tableExpired: 'Прошло больше 4 часов — стол забыт. Чтобы заказать в ресторане, отсканируйте QR-код ещё раз.',
      barTable: (x) => `Заказ на стол ${x}`, barTableSub: 'Отправить официанту', barDvSub: 'Оформить доставку', barBrowseSub: 'Выберите, как заказать',
      scanTitle: 'QR-код стола', scanHint: 'Наведите камеру на QR-код на вашем столе', scanStart: 'Включить камеру', scanNoCam: 'На этом устройстве камера недоступна.',
      scanDenied: 'Нет доступа к камере. Разрешите его в настройках браузера.', scanAlt: 'Или наведите обычную камеру телефона на QR-код на столе.',
      scanBad: 'Это не QR-код стола нашего ресторана.', scanOk: (x) => `Стол ${x} — можно заказывать`,
      dvAddr: 'Адрес', dvAddrPh: 'Улица, дом, подъезд, квартира', dvName: 'Имя', dvNamePh: 'Как к вам обращаться', dvNote: 'Комментарий', dvNotePh: 'Например: позвоните, когда подъедете',
      dvMe: 'Моё местоположение', dvPinHint: 'Нажмите на карту, чтобы отметить, куда привезти', dvFrom: 'от ресторана', dvKm: (x) => `${x} км`,
      dvPayCash: 'Наличными', dvPayCard: 'Картой курьеру', dvPayCashC: 'Наличными курьеру',
      dvDishes: (n) => `Блюда · ${n}`, dvFeeUpTo: (km) => `Доставка · до ${km} км`, dvFee: 'Доставка',
      dvSend: (s) => `Заказать доставку · ${s}`, dvMin: (s) => `Минимальный заказ для доставки — ${s} (без стоимости доставки).`,
      dvOff: 'Доставка сейчас не работает. Можно заказать в ресторане.', dvTooFar: (km) => `До этой точки ${km} км — так далеко мы пока не возим.`,
      dvNeedPoint: 'Отметьте на карте, куда привезти.', dvNeedAddr: 'Напишите адрес: улица, дом, квартира (не короче 5 символов).',
      dvBadReq: 'Проверьте адрес, имя, телефон и способ оплаты.', dvTooMany: 'Сейчас не можем принять ещё одну доставку (с этого номера уже есть заказы в работе или их слишком много). Попробуйте позже или позвоните в ресторан.',
      dvGeoErr: 'Не получилось определить местоположение. Отметьте точку на карте.', dvMapErr: 'Карта не загрузилась. Проверьте интернет и попробуйте ещё раз.',
      dvSaveHint: 'Имя, телефон и адрес сохранятся на этом телефоне — в следующий раз вводить не нужно.',
      cartEmpty: 'Корзина пуста', cartEmptyHint: 'Добавьте блюда из меню — потом вернитесь сюда.', openMenu: 'Открыть меню', toDelivery: 'Оформить доставку',
      trDv: (n) => `Доставка · заказ № ${n}`, trTable: (x, n) => `Стол ${x} · заказ № ${n}`,
      dvSt: { confirm: 'Ждём звонка ресторана', new: 'Ждём подтверждения', accepted: 'Ресторан принял заказ', cooking: 'Готовим ваш заказ', ready: 'Заказ готов', on_the_way: 'Курьер уже в пути', served: 'Доставлено', cancelled: 'Заказ отменён' },
      dvHint: { confirm: 'Ресторан позвонит, чтобы подтвердить заказ. Готовить начнут после подтверждения.', new: 'Ресторан видит заказ и скоро подтвердит его.', accepted: 'Скоро начнём готовить.', cooking: 'Повар готовит ваш заказ.', ready: 'Заказ готов — ждём курьера.', on_the_way: 'Курьер везёт ваш заказ.', served: 'Приятного аппетита!', cancelled: 'Если это ошибка — позвоните в ресторан.' },
      stWait: 'Ждём подтверждения', stAccepted: 'Ресторан принял', stCooking: 'Готовим', stReady: 'Готово — ждём курьера', stWay: 'В пути', stDone: 'Доставлено',
      dvCallHint: (p) => `Ресторан позвонит на ${p}, чтобы подтвердить заказ. Готовить начнут после подтверждения.`, stCalled: 'Заказ подтверждён',
      dvNoAnswer: 'Не дозвонились — заказ отменён', dvNoAnswerHint: 'Ресторан не смог до вас дозвониться. Закажите ещё раз или позвоните в ресторан.',
      dvWillCall: 'Ресторан позвонит, чтобы подтвердить заказ.', dvMayCall: 'Ресторан может позвонить, чтобы подтвердить заказ.',
      smsTitle: 'Подтвердите номер', smsWhy: 'Пришлём код в SMS — так ресторан знает, что номер ваш.', smsSent: (p) => `Код отправлен на ${p}`, smsSending: 'Отправляем код…',
      smsCode: 'Код из SMS', smsVerify: 'Подтвердить', smsResend: 'Отправить код ещё раз', smsResendIn: (s) => `Отправить код ещё раз (${s})`,
      smsBad: (n) => `Неверный код, осталось ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'попытка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'попытки' : 'попыток'}`,
      smsExpired: 'Код устарел — отправьте новый.', smsTooMany: 'Слишком много неверных попыток — отправьте новый код.',
      smsLimit: 'Слишком много SMS на этот номер. Попробуйте через час или позвоните в ресторан.', smsBadPhone: 'Проверьте номер: код приходит только на малайзийские номера, например +60 12 345 6789.',
      smsOff: 'SMS сейчас не отправляются. Позвоните в ресторан.', smsFailed: 'Не удалось отправить SMS. Попробуйте ещё раз или позвоните в ресторан.', smsChange: 'Изменить номер', smsOk: 'Номер подтверждён',
      courier: (x) => `Курьер ${x}`, kmToYou: (x) => `${x} км до вас`,
      ordersEmpty: 'Здесь появятся ваши заказы', ordersHint: 'Заказы с этого телефона — за столом и с доставкой — за последние 3 дня.',
      myData: 'Мои данные', profHint: 'Хранится только на этом телефоне — чтобы не вводить заново.', about: 'О ресторане', favsEmpty: 'Нажмите на сердечко в карточке блюда — оно появится здесь.',
      bkParts: { morning: 'Утро', day: 'Обед', evening: 'Ужин', night: 'Ночь' }, bkBig: 'Большой компанией — лучше позвоните', bkSendAt: (s) => `Забронировать · ${s}`,
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
      svcBtn: 'Xizmat', callWaiter: 'Ofitsiantni chaqirish', askBill: "Hisobni so'rash", waiterComing: 'Ofitsiant kelmoqda', billComing: 'Hisob olib kelinmoqda',
      callSent: 'Ofitsiant signalni oldi va tez orada keladi.', billSent: 'Ofitsiant hisobni olib keladi.', callErr: "Signal yuborilmadi. Ofitsiantni qo'l bilan chaqiring yoki qayta urinib ko'ring.",
      payHow: "Qanday to'laysiz?", payCash: 'Naqd pul', payCard: 'Karta', payQr: 'QR-kod orqali',
      subtotal: 'Taomlar', service: (p) => `Xizmat haqi${p ? ` ${p}%` : ''}`, paid: "To'langan",
      required: 'majburiy', optional: 'ixtiyoriy', addFor: (s) => `Qo'shish · ${s}`, chooseOptions: 'Variantni tanlash',
      edited: (x) => `Restoran buyurtmani ${x} da o'zgartirdi`,
      wifi: 'Wi‑Fi', wifiNet: 'Tarmoq', wifiPass: 'Parol', wifiNoPass: 'Parolsiz', wifiHint: "Telefon sozlamalarida ulaning: Wi‑Fi → shu tarmoq → parol.", copy: 'Nusxalash', copied: 'Nusxalandi',
      receipt: 'Chek', receiptTitle: (n) => `Chek №${n}`, receiptSave: 'Saqlash yoki chop etish', receiptWait: "Ofitsiant hisobni yopganda chek shu yerda chiqadi.", receiptBack: 'Buyurtmaga',
      rcDate: 'Sana', rcWaiter: 'Ofitsiant', rcCashier: 'Kassir', rcOrders: 'Buyurtmalar', rcDiscount: 'Chegirma', rcRounding: 'Yaxlitlash', rcToPay: "To'lovga", rcTip: 'Choychaqa', rcPaidTotal: "Jami to'landi", rcThanks: 'Kelganingiz uchun rahmat!', rcVerifyCode: 'Tekshirish kodi', rcVerifyAt: 'Tekshirish',
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
      // ---------- ilova ----------
      tabHome: 'Bosh sahifa', tabMenu: 'Menyu', tabOrders: 'Buyurtmalar', tabProfile: 'Profil', back: 'Orqaga',
      howEat: 'Qanday ovqatlanamiz?', wayHere: 'Men restorandaman', wayHereSub: 'Kamerani stoldagi QR-kodga qarating', wayHereAt: (x) => `Stol ${x} — menyuni ochish`,
      wayDelivery: 'Yetkazib berish', wayDeliverySub: 'Uyingizga olib boramiz', waySoon: 'Tez orada', wayBookSub: 'Kun va vaqtni tanlang',
      recommend: 'Bugun tavsiya qilamiz', allMenu: 'Butun menyu',
      modeTable: (x) => `Stol ${x} · siz restorandasiz`, modeTableSub: "Buyurtma to'g'ri stolingizga keladi", modeChange: "O'zgartirish", modeExit: 'Chiqish',
      modeDv: 'Yetkazib berish', modeDvKm: (km, fee) => `Yetkazib berish · ${km} km · ${fee}`, modeDvSub: 'Manzil va narx — rasmiylashtirishda', modeEdit: "O'zgartirish",
      modeBrowse: "Menyuni ko'rish", modeBrowseSub: 'Stolda yoki yetkazib berish orqali buyurtma bering', modeChoose: 'Tanlash',
      howTitle: 'Qanday buyurtma berasiz?', howHint: "Usulni tanlashingiz bilan taom qo'shiladi.",
      tableExpired: "4 soatdan ko'p vaqt o'tdi — stol unutildi. Restoranda buyurtma berish uchun QR-kodni qayta skanerlang.",
      barTable: (x) => `Stol ${x} uchun buyurtma`, barTableSub: 'Ofitsiantga yuborish', barDvSub: 'Yetkazib berishni rasmiylashtirish', barBrowseSub: 'Buyurtma usulini tanlang',
      scanTitle: 'Stol QR-kodi', scanHint: 'Kamerani stolingizdagi QR-kodga qarating', scanStart: 'Kamerani yoqish', scanNoCam: 'Bu qurilmada kamera mavjud emas.',
      scanDenied: "Kameraga ruxsat yo'q. Brauzer sozlamalarida ruxsat bering.", scanAlt: 'Yoki telefonning oddiy kamerasini stoldagi QR-kodga qarating.',
      scanBad: 'Bu restoranimiz stolining QR-kodi emas.', scanOk: (x) => `Stol ${x} — buyurtma berish mumkin`,
      dvAddr: 'Manzil', dvAddrPh: "Ko'cha, uy, podyezd, xonadon", dvName: 'Ism', dvNamePh: 'Sizga qanday murojaat qilaylik', dvNote: 'Izoh', dvNotePh: "Masalan: yetib kelganda qo'ng'iroq qiling",
      dvMe: 'Mening joylashuvim', dvPinHint: 'Qayerga olib borishni xaritada belgilang', dvFrom: 'restorandan', dvKm: (x) => `${x} km`,
      dvPayCash: 'Naqd pul', dvPayCard: 'Kuryerga karta bilan', dvPayCashC: 'Kuryerga naqd pul',
      dvDishes: (n) => `Taomlar · ${n}`, dvFeeUpTo: (km) => `Yetkazib berish · ${km} km gacha`, dvFee: 'Yetkazib berish',
      dvSend: (s) => `Yetkazib berishga buyurtma · ${s}`, dvMin: (s) => `Yetkazib berish uchun eng kam buyurtma — ${s} (yetkazib berish narxisiz).`,
      dvOff: 'Yetkazib berish hozir ishlamayapti. Restoranda buyurtma berish mumkin.', dvTooFar: (km) => `Bu nuqtagacha ${km} km — hozircha bunchalik uzoqqa olib bormaymiz.`,
      dvNeedPoint: 'Qayerga olib borishni xaritada belgilang.', dvNeedAddr: "Manzilni yozing: ko'cha, uy, xonadon (kamida 5 belgi).",
      dvBadReq: "Manzil, ism, telefon va to'lov usulini tekshiring.", dvTooMany: "Hozir yana bir yetkazib berishni qabul qila olmaymiz (bu raqamdan buyurtmalar jarayonda yoki ular juda ko'p). Keyinroq urinib ko'ring yoki restoranga qo'ng'iroq qiling.",
      dvGeoErr: "Joylashuvni aniqlab bo'lmadi. Nuqtani xaritada belgilang.", dvMapErr: "Xarita yuklanmadi. Internetni tekshirib, qayta urinib ko'ring.",
      dvSaveHint: 'Ism, telefon va manzil shu telefonda saqlanadi — keyingi safar qayta kiritish shart emas.',
      cartEmpty: "Savat bo'sh", cartEmptyHint: "Menyudan taom qo'shing — so'ng bu yerga qayting.", openMenu: 'Menyuni ochish', toDelivery: 'Yetkazib berishni rasmiylashtirish',
      trDv: (n) => `Yetkazib berish · buyurtma № ${n}`, trTable: (x, n) => `Stol ${x} · buyurtma № ${n}`,
      dvSt: { confirm: "Restoran qo'ng'irog'ini kutyapmiz", new: 'Tasdiq kutilmoqda', accepted: 'Restoran buyurtmani qabul qildi', cooking: 'Buyurtmangiz tayyorlanmoqda', ready: 'Buyurtma tayyor', on_the_way: "Kuryer yo'lda", served: 'Yetkazildi', cancelled: 'Buyurtma bekor qilindi' },
      dvHint: { confirm: "Restoran buyurtmani tasdiqlash uchun qo'ng'iroq qiladi. Tasdiqlangandan keyin tayyorlashni boshlaymiz.", new: "Restoran buyurtmani ko'rdi va tez orada tasdiqlaydi.", accepted: 'Tez orada tayyorlashni boshlaymiz.', cooking: 'Oshpaz buyurtmangizni tayyorlamoqda.', ready: 'Buyurtma tayyor — kuryerni kutyapmiz.', on_the_way: 'Kuryer buyurtmangizni olib kelmoqda.', served: 'Yoqimli ishtaha!', cancelled: "Agar bu xato bo'lsa — restoranga qo'ng'iroq qiling." },
      stWait: 'Tasdiq kutilmoqda', stAccepted: 'Restoran qabul qildi', stCooking: 'Tayyorlanmoqda', stReady: 'Tayyor — kuryer kutilmoqda', stWay: "Yo'lda", stDone: 'Yetkazildi',
      dvCallHint: (p) => `Restoran buyurtmani tasdiqlash uchun ${p} raqamiga qo'ng'iroq qiladi. Tasdiqlangandan keyin tayyorlashni boshlaymiz.`, stCalled: 'Buyurtma tasdiqlandi',
      dvNoAnswer: "Qo'ng'iroqqa javob bo'lmadi — buyurtma bekor qilindi", dvNoAnswerHint: "Restoran sizga qo'ng'iroq qila olmadi. Qaytadan buyurtma bering yoki restoranga qo'ng'iroq qiling.",
      dvWillCall: "Restoran buyurtmani tasdiqlash uchun qo'ng'iroq qiladi.", dvMayCall: "Restoran buyurtmani tasdiqlash uchun qo'ng'iroq qilishi mumkin.",
      smsTitle: 'Raqamni tasdiqlang', smsWhy: 'SMS orqali kod yuboramiz — shunda restoran raqam sizniki ekanini biladi.', smsSent: (p) => `Kod ${p} raqamiga yuborildi`, smsSending: 'Kod yuborilmoqda…',
      smsCode: 'SMS dagi kod', smsVerify: 'Tasdiqlash', smsResend: 'Kodni qayta yuborish', smsResendIn: (s) => `Kodni qayta yuborish (${s})`,
      smsBad: (n) => `Kod noto'g'ri, ${n} ta urinish qoldi`,
      smsExpired: 'Kod eskirgan — yangisini yuboring.', smsTooMany: "Noto'g'ri urinishlar juda ko'p — yangi kod yuboring.",
      smsLimit: "Bu raqamga juda ko'p SMS yuborildi. Bir soatdan keyin urinib ko'ring yoki restoranga qo'ng'iroq qiling.", smsBadPhone: 'Raqamni tekshiring: kod faqat Malayziya raqamlariga keladi, masalan +60 12 345 6789.',
      smsOff: "Hozir SMS yuborilmayapti. Restoranga qo'ng'iroq qiling.", smsFailed: "SMS yuborib bo'lmadi. Qayta urinib ko'ring yoki restoranga qo'ng'iroq qiling.", smsChange: "Raqamni o'zgartirish", smsOk: 'Raqam tasdiqlandi',
      courier: (x) => `Kuryer ${x}`, kmToYou: (x) => `sizgacha ${x} km`,
      ordersEmpty: 'Buyurtmalaringiz shu yerda chiqadi', ordersHint: 'Shu telefondan berilgan buyurtmalar — stolda va yetkazib berish — oxirgi 3 kun.',
      myData: "Mening ma'lumotlarim", profHint: 'Faqat shu telefonda saqlanadi — qayta kiritmaslik uchun.', about: 'Restoran haqida', favsEmpty: "Taom kartasidagi yurakchani bosing — u shu yerda paydo bo'ladi.",
      bkParts: { morning: 'Ertalab', day: 'Tushlik', evening: 'Kechki ovqat', night: 'Tun' }, bkBig: "Katta davra bilan — qo'ng'iroq qilgan ma'qul", bkSendAt: (s) => `Band qilish · ${s}`,
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
      svcBtn: 'Service', callWaiter: 'Call waiter', askBill: 'Ask for the bill', waiterComing: 'Waiter is coming', billComing: 'Bill is on its way',
      callSent: 'The waiter got your call and will be with you shortly.', billSent: 'The waiter will bring your bill.', callErr: "Couldn't send the call. Please wave to a waiter or try again.",
      payHow: 'How would you like to pay?', payCash: 'Cash', payCard: 'Card', payQr: 'QR code',
      subtotal: 'Items', service: (p) => `Service charge${p ? ` ${p}%` : ''}`, paid: 'Paid',
      required: 'required', optional: 'optional', addFor: (s) => `Add · ${s}`, chooseOptions: 'Choose options',
      edited: (x) => `The restaurant updated your order at ${x}`,
      wifi: 'Wi‑Fi', wifiNet: 'Network', wifiPass: 'Password', wifiNoPass: 'No password', wifiHint: 'Connect in your phone settings: Wi‑Fi → this network → password.', copy: 'Copy', copied: 'Copied',
      receipt: 'Receipt', receiptTitle: (n) => `Receipt #${n}`, receiptSave: 'Save or print', receiptWait: 'Your receipt will appear here once the waiter closes the bill.', receiptBack: 'Back to order',
      rcDate: 'Date', rcWaiter: 'Waiter', rcCashier: 'Cashier', rcOrders: 'Orders', rcDiscount: 'Discount', rcRounding: 'Rounding', rcToPay: 'To pay', rcTip: 'Tip', rcPaidTotal: 'Total paid', rcThanks: 'Thank you for visiting us!', rcVerifyCode: 'Verification code', rcVerifyAt: 'Verify at',
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
      // ---------- app ----------
      tabHome: 'Home', tabMenu: 'Menu', tabOrders: 'Orders', tabProfile: 'Profile', back: 'Back',
      howEat: 'How would you like to eat?', wayHere: "I'm at the restaurant", wayHereSub: 'Point your camera at the QR code on your table', wayHereAt: (x) => `Table ${x} — open the menu`,
      wayDelivery: 'Delivery', wayDeliverySub: 'Brought to your door', waySoon: 'Coming soon', wayBookSub: 'Pick a day and time',
      recommend: "Today's picks", allMenu: 'Full menu',
      modeTable: (x) => `Table ${x} · you're at the restaurant`, modeTableSub: 'Your order comes straight to your table', modeChange: 'Change', modeExit: 'Leave',
      modeDv: 'Delivery', modeDvKm: (km, fee) => `Delivery · ${km} km · ${fee}`, modeDvSub: 'Address and fee at checkout', modeEdit: 'Edit',
      modeBrowse: 'Browsing the menu', modeBrowseSub: 'Order at your table or for delivery', modeChoose: 'Choose',
      howTitle: 'How would you like to order?', howHint: 'The dish will be added as soon as you choose.',
      tableExpired: 'More than 4 hours have passed, so your table was forgotten. To order at the restaurant, scan the QR code again.',
      barTable: (x) => `Order to table ${x}`, barTableSub: 'Send to the waiter', barDvSub: 'Check out for delivery', barBrowseSub: 'Choose how to order',
      scanTitle: 'Table QR code', scanHint: 'Point the camera at the QR code on your table', scanStart: 'Turn on the camera', scanNoCam: 'The camera is not available on this device.',
      scanDenied: 'No access to the camera. Allow it in your browser settings.', scanAlt: "Or point your phone's regular camera at the QR code on the table.",
      scanBad: "This is not one of our restaurant's table QR codes.", scanOk: (x) => `Table ${x} — you can order now`,
      dvAddr: 'Address', dvAddrPh: 'Street, building, entrance, unit', dvName: 'Name', dvNamePh: 'What should we call you', dvNote: 'Comment', dvNotePh: 'For example: call when you arrive',
      dvMe: 'My location', dvPinHint: 'Tap the map to mark where to deliver', dvFrom: 'from the restaurant', dvKm: (x) => `${x} km`,
      dvPayCash: 'Cash', dvPayCard: 'Card to courier', dvPayCashC: 'Cash to courier',
      dvDishes: (n) => `Dishes · ${n}`, dvFeeUpTo: (km) => `Delivery · up to ${km} km`, dvFee: 'Delivery',
      dvSend: (s) => `Order delivery · ${s}`, dvMin: (s) => `The minimum order for delivery is ${s} (not counting the delivery fee).`,
      dvOff: 'Delivery is not available right now. You can order at the restaurant.', dvTooFar: (km) => `This point is ${km} km away — we don't deliver that far yet.`,
      dvNeedPoint: 'Mark on the map where to deliver.', dvNeedAddr: 'Write the address: street, building, unit (at least 5 characters).',
      dvBadReq: 'Check the address, name, phone and payment method.', dvTooMany: 'We cannot take another delivery right now (this number already has orders in progress, or there are too many). Please try later or call the restaurant.',
      dvGeoErr: "Couldn't find your location. Mark the point on the map.", dvMapErr: "The map didn't load. Check your connection and try again.",
      dvSaveHint: "Your name, phone and address are saved on this phone, so you won't need to type them again.",
      cartEmpty: 'Your cart is empty', cartEmptyHint: 'Add dishes from the menu, then come back here.', openMenu: 'Open the menu', toDelivery: 'Check out for delivery',
      trDv: (n) => `Delivery · order No. ${n}`, trTable: (x, n) => `Table ${x} · order No. ${n}`,
      dvSt: { confirm: 'Waiting for the restaurant to call', new: 'Waiting for confirmation', accepted: 'The restaurant accepted your order', cooking: "We're cooking your order", ready: 'Your order is ready', on_the_way: 'The courier is on the way', served: 'Delivered', cancelled: 'Order cancelled' },
      dvHint: { confirm: 'The restaurant will call you to confirm the order. Cooking starts after confirmation.', new: 'The restaurant has your order and will confirm it shortly.', accepted: "We'll start cooking soon.", cooking: 'The chef is preparing your order.', ready: 'Your order is ready — waiting for the courier.', on_the_way: 'The courier is bringing your order.', served: 'Enjoy your meal!', cancelled: 'If this is a mistake, please call the restaurant.' },
      stWait: 'Waiting for confirmation', stAccepted: 'Restaurant accepted', stCooking: 'Cooking', stReady: 'Ready — waiting for the courier', stWay: 'On the way', stDone: 'Delivered',
      dvCallHint: (p) => `The restaurant will call ${p} to confirm the order. Cooking starts after confirmation.`, stCalled: 'Order confirmed',
      dvNoAnswer: "Couldn't reach you — order cancelled", dvNoAnswerHint: "The restaurant couldn't reach you by phone. Please order again or call the restaurant.",
      dvWillCall: 'The restaurant will call to confirm your order.', dvMayCall: 'The restaurant may call to confirm your order.',
      smsTitle: 'Confirm your number', smsWhy: "We'll text you a code so the restaurant knows the number is yours.", smsSent: (p) => `Code sent to ${p}`, smsSending: 'Sending the code…',
      smsCode: 'Code from SMS', smsVerify: 'Confirm', smsResend: 'Send the code again', smsResendIn: (s) => `Send the code again (${s})`,
      smsBad: (n) => `Wrong code, ${n} ${n === 1 ? 'attempt' : 'attempts'} left`,
      smsExpired: 'The code has expired — send a new one.', smsTooMany: 'Too many wrong attempts — send a new code.',
      smsLimit: 'Too many texts to this number. Try again in an hour or call the restaurant.', smsBadPhone: 'Check the number: codes go to Malaysian numbers only, e.g. +60 12 345 6789.',
      smsOff: 'Texts cannot be sent right now. Please call the restaurant.', smsFailed: 'Could not send the text. Try again or call the restaurant.', smsChange: 'Change number', smsOk: 'Number confirmed',
      courier: (x) => `Courier ${x}`, kmToYou: (x) => `${x} km to you`,
      ordersEmpty: 'Your orders will appear here', ordersHint: 'Orders from this phone — at the table and for delivery — from the last 3 days.',
      myData: 'My details', profHint: "Kept only on this phone, so you don't have to type them again.", about: 'About the restaurant', favsEmpty: 'Tap the heart on a dish and it will appear here.',
      bkParts: { morning: 'Morning', day: 'Lunch', evening: 'Dinner', night: 'Night' }, bkBig: 'For a large group, it is best to call', bkSendAt: (s) => `Book · ${s}`,
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
      svcBtn: 'الخدمة', callWaiter: 'استدعاء النادل', askBill: 'طلب الفاتورة', waiterComing: 'النادل في الطريق', billComing: 'الفاتورة في الطريق',
      callSent: 'وصل طلبك إلى النادل وسيأتي قريبًا.', billSent: 'سيُحضر النادل الفاتورة.', callErr: 'تعذّر إرسال الطلب. يرجى الإشارة إلى النادل أو المحاولة مجددًا.',
      payHow: 'كيف تودّ الدفع؟', payCash: 'نقدًا', payCard: 'بالبطاقة', payQr: 'رمز QR',
      subtotal: 'الأطباق', service: (p) => `رسوم الخدمة${p ? ` ${p}%` : ''}`, paid: 'مدفوع',
      required: 'إلزامي', optional: 'اختياري', addFor: (s) => `إضافة · ${s}`, chooseOptions: 'اختيار الخيارات',
      edited: (x) => `عدّل المطعم طلبك في ${x}`,
      wifi: 'Wi‑Fi', wifiNet: 'الشبكة', wifiPass: 'كلمة المرور', wifiNoPass: 'بدون كلمة مرور', wifiHint: 'اتصل من إعدادات الهاتف: Wi‑Fi ← هذه الشبكة ← كلمة المرور.', copy: 'نسخ', copied: 'تم النسخ',
      receipt: 'الإيصال', receiptTitle: (n) => `إيصال رقم ${n}`, receiptSave: 'حفظ أو طباعة', receiptWait: 'سيظهر الإيصال هنا عندما يغلق النادل الحساب.', receiptBack: 'العودة إلى الطلب',
      rcDate: 'التاريخ', rcWaiter: 'النادل', rcCashier: 'أمين الصندوق', rcOrders: 'الطلبات', rcDiscount: 'خصم', rcRounding: 'التقريب', rcToPay: 'المبلغ المستحق', rcTip: 'إكرامية', rcPaidTotal: 'إجمالي المدفوع', rcThanks: 'شكرًا لزيارتكم!', rcVerifyCode: 'رمز التحقق', rcVerifyAt: 'تحقق عبر',
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
      // ---------- التطبيق ----------
      tabHome: 'الرئيسية', tabMenu: 'القائمة', tabOrders: 'الطلبات', tabProfile: 'حسابي', back: 'رجوع',
      howEat: 'كيف تحب أن تأكل؟', wayHere: 'أنا في المطعم', wayHereSub: 'وجّه الكاميرا إلى رمز QR على الطاولة', wayHereAt: (x) => `الطاولة ${x} — افتح القائمة`,
      wayDelivery: 'التوصيل', wayDeliverySub: 'نوصله إلى بابك', waySoon: 'قريبًا', wayBookSub: 'اختر اليوم والوقت',
      recommend: 'ننصح اليوم', allMenu: 'القائمة كاملة',
      modeTable: (x) => `الطاولة ${x} · أنت في المطعم`, modeTableSub: 'سيصل طلبك إلى طاولتك مباشرة', modeChange: 'تغيير', modeExit: 'خروج',
      modeDv: 'التوصيل', modeDvKm: (km, fee) => `التوصيل · ${km} كم · ${fee}`, modeDvSub: 'العنوان والرسوم عند إتمام الطلب', modeEdit: 'تعديل',
      modeBrowse: 'تصفّح القائمة', modeBrowseSub: 'اطلب من طاولتك أو مع التوصيل', modeChoose: 'اختيار',
      howTitle: 'كيف تريد أن تطلب؟', howHint: 'سيُضاف الطبق بمجرد أن تختار.',
      tableExpired: 'مرّت أكثر من 4 ساعات فنُسيت الطاولة. للطلب في المطعم امسح رمز QR مرة أخرى.',
      barTable: (x) => `طلب إلى الطاولة ${x}`, barTableSub: 'إرسال إلى النادل', barDvSub: 'إتمام طلب التوصيل', barBrowseSub: 'اختر طريقة الطلب',
      scanTitle: 'رمز QR للطاولة', scanHint: 'وجّه الكاميرا إلى رمز QR على طاولتك', scanStart: 'تشغيل الكاميرا', scanNoCam: 'الكاميرا غير متاحة على هذا الجهاز.',
      scanDenied: 'لا يوجد إذن للكاميرا. اسمح بها في إعدادات المتصفح.', scanAlt: 'أو وجّه كاميرا الهاتف العادية إلى رمز QR على الطاولة.',
      scanBad: 'هذا ليس رمز QR لطاولة في مطعمنا.', scanOk: (x) => `الطاولة ${x} — يمكنك الطلب الآن`,
      dvAddr: 'العنوان', dvAddrPh: 'الشارع، المبنى، المدخل، الشقة', dvName: 'الاسم', dvNamePh: 'كيف نناديك', dvNote: 'ملاحظة', dvNotePh: 'مثال: اتصل عند الوصول',
      dvMe: 'موقعي', dvPinHint: 'اضغط على الخريطة لتحديد مكان التوصيل', dvFrom: 'من المطعم', dvKm: (x) => `${x} كم`,
      dvPayCash: 'نقدًا', dvPayCard: 'بالبطاقة للمندوب', dvPayCashC: 'نقدًا للمندوب',
      dvDishes: (n) => `الأطباق · ${n}`, dvFeeUpTo: (km) => `التوصيل · حتى ${km} كم`, dvFee: 'التوصيل',
      dvSend: (s) => `اطلب التوصيل · ${s}`, dvMin: (s) => `الحد الأدنى لطلب التوصيل ${s} (من دون رسوم التوصيل).`,
      dvOff: 'التوصيل غير متاح الآن. يمكنك الطلب في المطعم.', dvTooFar: (km) => `هذه النقطة على بعد ${km} كم — لا نوصل إلى هذه المسافة بعد.`,
      dvNeedPoint: 'حدّد على الخريطة مكان التوصيل.', dvNeedAddr: 'اكتب العنوان: الشارع، المبنى، الشقة (5 أحرف على الأقل).',
      dvBadReq: 'تحقق من العنوان والاسم والهاتف وطريقة الدفع.', dvTooMany: 'لا يمكننا قبول طلب توصيل آخر الآن (لدى هذا الرقم طلبات قيد التنفيذ أو الطلبات كثيرة). حاول لاحقًا أو اتصل بالمطعم.',
      dvGeoErr: 'تعذّر تحديد موقعك. حدّد النقطة على الخريطة.', dvMapErr: 'لم يتم تحميل الخريطة. تحقق من الإنترنت وحاول مرة أخرى.',
      dvSaveHint: 'سيُحفظ الاسم والهاتف والعنوان على هذا الهاتف فلن تحتاج إلى كتابتها مرة أخرى.',
      cartEmpty: 'السلة فارغة', cartEmptyHint: 'أضف أطباقًا من القائمة ثم عد إلى هنا.', openMenu: 'افتح القائمة', toDelivery: 'إتمام طلب التوصيل',
      trDv: (n) => `توصيل · طلب رقم ${n}`, trTable: (x, n) => `الطاولة ${x} · طلب رقم ${n}`,
      dvSt: { confirm: 'بانتظار اتصال المطعم', new: 'بانتظار التأكيد', accepted: 'قبل المطعم طلبك', cooking: 'نحضّر طلبك', ready: 'طلبك جاهز', on_the_way: 'المندوب في الطريق', served: 'تم التوصيل', cancelled: 'أُلغي الطلب' },
      dvHint: { confirm: 'سيتصل بك المطعم لتأكيد الطلب. يبدأ التحضير بعد التأكيد.', new: 'استلم المطعم طلبك وسيؤكده قريبًا.', accepted: 'سنبدأ التحضير قريبًا.', cooking: 'الطاهي يحضّر طلبك.', ready: 'طلبك جاهز — بانتظار المندوب.', on_the_way: 'المندوب في طريقه إليك بطلبك.', served: 'بالهناء والشفاء!', cancelled: 'إذا كان هذا خطأ فاتصل بالمطعم.' },
      stWait: 'بانتظار التأكيد', stAccepted: 'قبل المطعم', stCooking: 'نحضّر', stReady: 'جاهز — بانتظار المندوب', stWay: 'في الطريق', stDone: 'تم التوصيل',
      dvCallHint: (p) => `سيتصل المطعم بالرقم ${p} لتأكيد الطلب. يبدأ التحضير بعد التأكيد.`, stCalled: 'تم تأكيد الطلب',
      dvNoAnswer: 'تعذّر الاتصال بك — أُلغي الطلب', dvNoAnswerHint: 'لم يتمكن المطعم من الاتصال بك. اطلب مرة أخرى أو اتصل بالمطعم.',
      dvWillCall: 'سيتصل المطعم لتأكيد طلبك.', dvMayCall: 'قد يتصل المطعم لتأكيد طلبك.',
      smsTitle: 'أكّد رقمك', smsWhy: 'سنرسل لك رمزًا في رسالة نصية ليعرف المطعم أن الرقم لك.', smsSent: (p) => `أُرسل الرمز إلى ${p}`, smsSending: 'جارٍ إرسال الرمز…',
      smsCode: 'الرمز من الرسالة', smsVerify: 'تأكيد', smsResend: 'إرسال الرمز مرة أخرى', smsResendIn: (s) => `إرسال الرمز مرة أخرى (${s})`,
      smsBad: (n) => `رمز خاطئ، تبقّى ${n} من المحاولات`,
      smsExpired: 'انتهت صلاحية الرمز — أرسل رمزًا جديدًا.', smsTooMany: 'محاولات خاطئة كثيرة — أرسل رمزًا جديدًا.',
      smsLimit: 'أُرسلت رسائل كثيرة إلى هذا الرقم. حاول بعد ساعة أو اتصل بالمطعم.', smsBadPhone: 'تحقق من الرقم: يُرسل الرمز إلى الأرقام الماليزية فقط، مثلًا +60 12 345 6789.',
      smsOff: 'لا يمكن إرسال الرسائل الآن. اتصل بالمطعم.', smsFailed: 'تعذّر إرسال الرسالة. حاول مرة أخرى أو اتصل بالمطعم.', smsChange: 'تغيير الرقم', smsOk: 'تم تأكيد الرقم',
      courier: (x) => `المندوب ${x}`, kmToYou: (x) => `${x} كم إليك`,
      ordersEmpty: 'ستظهر طلباتك هنا', ordersHint: 'الطلبات من هذا الهاتف — على الطاولة ومع التوصيل — خلال آخر 3 أيام.',
      myData: 'بياناتي', profHint: 'تُحفظ على هذا الهاتف فقط حتى لا تكتبها مرة أخرى.', about: 'عن المطعم', favsEmpty: 'اضغط على القلب في بطاقة الطبق وسيظهر هنا.',
      bkParts: { morning: 'الصباح', day: 'الغداء', evening: 'العشاء', night: 'الليل' }, bkBig: 'للمجموعات الكبيرة يُفضّل الاتصال', bkSendAt: (s) => `احجز · ${s}`,
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
      svcBtn: 'Servis', callWaiter: 'Panggil pelayan', askBill: 'Minta bil', waiterComing: 'Pelayan sedang datang', billComing: 'Bil sedang dibawa',
      callSent: 'Pelayan telah menerima panggilan anda dan akan datang sebentar lagi.', billSent: 'Pelayan akan membawa bil anda.', callErr: 'Panggilan tidak dapat dihantar. Sila lambai pelayan atau cuba lagi.',
      payHow: 'Bagaimana anda mahu membayar?', payCash: 'Tunai', payCard: 'Kad', payQr: 'Kod QR',
      subtotal: 'Hidangan', service: (p) => `Caj perkhidmatan${p ? ` ${p}%` : ''}`, paid: 'Dibayar',
      required: 'wajib', optional: 'pilihan', addFor: (s) => `Tambah · ${s}`, chooseOptions: 'Pilih pilihan',
      edited: (x) => `Restoran telah mengemas kini pesanan anda pada ${x}`,
      wifi: 'Wi‑Fi', wifiNet: 'Rangkaian', wifiPass: 'Kata laluan', wifiNoPass: 'Tiada kata laluan', wifiHint: 'Sambung dalam tetapan telefon: Wi‑Fi → rangkaian ini → kata laluan.', copy: 'Salin', copied: 'Disalin',
      receipt: 'Resit', receiptTitle: (n) => `Resit #${n}`, receiptSave: 'Simpan atau cetak', receiptWait: 'Resit akan muncul di sini selepas pelayan menutup bil.', receiptBack: 'Kembali ke pesanan',
      rcDate: 'Tarikh', rcWaiter: 'Pelayan', rcCashier: 'Juruwang', rcOrders: 'Pesanan', rcDiscount: 'Diskaun', rcRounding: 'Pembundaran', rcToPay: 'Perlu dibayar', rcTip: 'Tip', rcPaidTotal: 'Jumlah dibayar', rcThanks: 'Terima kasih kerana berkunjung!', rcVerifyCode: 'Kod pengesahan', rcVerifyAt: 'Sahkan di',
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
      // ---------- aplikasi ----------
      tabHome: 'Utama', tabMenu: 'Menu', tabOrders: 'Pesanan', tabProfile: 'Profil', back: 'Kembali',
      howEat: 'Bagaimana anda mahu makan?', wayHere: 'Saya di restoran', wayHereSub: 'Halakan kamera ke kod QR di meja', wayHereAt: (x) => `Meja ${x} — buka menu`,
      wayDelivery: 'Penghantaran', wayDeliverySub: 'Dihantar ke rumah anda', waySoon: 'Akan datang', wayBookSub: 'Pilih hari dan masa',
      recommend: 'Cadangan hari ini', allMenu: 'Menu penuh',
      modeTable: (x) => `Meja ${x} · anda di restoran`, modeTableSub: 'Pesanan terus ke meja anda', modeChange: 'Tukar', modeExit: 'Keluar',
      modeDv: 'Penghantaran', modeDvKm: (km, fee) => `Penghantaran · ${km} km · ${fee}`, modeDvSub: 'Alamat dan caj semasa membuat pesanan', modeEdit: 'Ubah',
      modeBrowse: 'Melihat menu', modeBrowseSub: 'Pesan di meja atau untuk penghantaran', modeChoose: 'Pilih',
      howTitle: 'Bagaimana anda mahu memesan?', howHint: 'Hidangan akan ditambah sebaik sahaja anda memilih.',
      tableExpired: 'Sudah lebih 4 jam, jadi meja anda dilupakan. Untuk memesan di restoran, imbas kod QR sekali lagi.',
      barTable: (x) => `Pesanan ke meja ${x}`, barTableSub: 'Hantar kepada pelayan', barDvSub: 'Teruskan ke penghantaran', barBrowseSub: 'Pilih cara memesan',
      scanTitle: 'Kod QR meja', scanHint: 'Halakan kamera ke kod QR di meja anda', scanStart: 'Hidupkan kamera', scanNoCam: 'Kamera tidak tersedia pada peranti ini.',
      scanDenied: 'Tiada akses ke kamera. Benarkan dalam tetapan pelayar.', scanAlt: 'Atau halakan kamera biasa telefon ke kod QR di meja.',
      scanBad: 'Ini bukan kod QR meja restoran kami.', scanOk: (x) => `Meja ${x} — anda boleh memesan`,
      dvAddr: 'Alamat', dvAddrPh: 'Jalan, bangunan, pintu masuk, unit', dvName: 'Nama', dvNamePh: 'Bagaimana kami memanggil anda', dvNote: 'Komen', dvNotePh: 'Contoh: telefon apabila sampai',
      dvMe: 'Lokasi saya', dvPinHint: 'Ketik peta untuk menandakan lokasi penghantaran', dvFrom: 'dari restoran', dvKm: (x) => `${x} km`,
      dvPayCash: 'Tunai', dvPayCard: 'Kad kepada penghantar', dvPayCashC: 'Tunai kepada penghantar',
      dvDishes: (n) => `Hidangan · ${n}`, dvFeeUpTo: (km) => `Penghantaran · hingga ${km} km`, dvFee: 'Penghantaran',
      dvSend: (s) => `Pesan penghantaran · ${s}`, dvMin: (s) => `Pesanan minimum untuk penghantaran ialah ${s} (tidak termasuk caj penghantaran).`,
      dvOff: 'Penghantaran tidak tersedia sekarang. Anda boleh memesan di restoran.', dvTooFar: (km) => `Lokasi ini ${km} km jauhnya — kami belum menghantar sejauh itu.`,
      dvNeedPoint: 'Tandakan di peta lokasi penghantaran.', dvNeedAddr: 'Tulis alamat: jalan, bangunan, unit (sekurang-kurangnya 5 aksara).',
      dvBadReq: 'Semak alamat, nama, telefon dan cara bayaran.', dvTooMany: 'Kami tidak dapat menerima penghantaran lagi sekarang (nombor ini sudah ada pesanan berjalan atau terlalu banyak pesanan). Cuba lagi nanti atau hubungi restoran.',
      dvGeoErr: 'Lokasi anda tidak dapat dikesan. Tandakan titik di peta.', dvMapErr: 'Peta tidak dimuatkan. Semak internet dan cuba lagi.',
      dvSaveHint: 'Nama, telefon dan alamat disimpan di telefon ini — tidak perlu ditaip semula lain kali.',
      cartEmpty: 'Troli kosong', cartEmptyHint: 'Tambah hidangan dari menu, kemudian kembali ke sini.', openMenu: 'Buka menu', toDelivery: 'Teruskan ke penghantaran',
      trDv: (n) => `Penghantaran · pesanan No. ${n}`, trTable: (x, n) => `Meja ${x} · pesanan No. ${n}`,
      dvSt: { confirm: 'Menunggu panggilan restoran', new: 'Menunggu pengesahan', accepted: 'Restoran menerima pesanan', cooking: 'Pesanan anda sedang dimasak', ready: 'Pesanan sudah siap', on_the_way: 'Penghantar dalam perjalanan', served: 'Telah dihantar', cancelled: 'Pesanan dibatalkan' },
      dvHint: { confirm: 'Restoran akan menelefon anda untuk mengesahkan pesanan. Masakan bermula selepas pengesahan.', new: 'Restoran telah menerima pesanan dan akan mengesahkannya sebentar lagi.', accepted: 'Kami akan mula memasak sebentar lagi.', cooking: 'Tukang masak sedang menyediakan pesanan anda.', ready: 'Pesanan siap — menunggu penghantar.', on_the_way: 'Penghantar sedang membawa pesanan anda.', served: 'Selamat menjamu selera!', cancelled: 'Jika ini satu kesilapan, sila hubungi restoran.' },
      stWait: 'Menunggu pengesahan', stAccepted: 'Restoran menerima', stCooking: 'Sedang dimasak', stReady: 'Siap — menunggu penghantar', stWay: 'Dalam perjalanan', stDone: 'Telah dihantar',
      dvCallHint: (p) => `Restoran akan menelefon ${p} untuk mengesahkan pesanan. Masakan bermula selepas pengesahan.`, stCalled: 'Pesanan disahkan',
      dvNoAnswer: 'Tidak dapat dihubungi — pesanan dibatalkan', dvNoAnswerHint: 'Restoran tidak dapat menghubungi anda. Sila pesan semula atau hubungi restoran.',
      dvWillCall: 'Restoran akan menelefon untuk mengesahkan pesanan anda.', dvMayCall: 'Restoran mungkin menelefon untuk mengesahkan pesanan anda.',
      smsTitle: 'Sahkan nombor anda', smsWhy: 'Kami hantar kod melalui SMS supaya restoran tahu nombor ini milik anda.', smsSent: (p) => `Kod dihantar ke ${p}`, smsSending: 'Menghantar kod…',
      smsCode: 'Kod SMS', smsVerify: 'Sahkan', smsResend: 'Hantar kod sekali lagi', smsResendIn: (s) => `Hantar kod sekali lagi (${s})`,
      smsBad: (n) => `Kod salah, tinggal ${n} cubaan`,
      smsExpired: 'Kod sudah tamat tempoh — hantar kod baharu.', smsTooMany: 'Terlalu banyak cubaan salah — hantar kod baharu.',
      smsLimit: 'Terlalu banyak SMS ke nombor ini. Cuba lagi selepas sejam atau hubungi restoran.', smsBadPhone: 'Semak nombor: kod hanya dihantar ke nombor Malaysia, contohnya +60 12 345 6789.',
      smsOff: 'SMS tidak dapat dihantar sekarang. Sila hubungi restoran.', smsFailed: 'SMS tidak dapat dihantar. Cuba lagi atau hubungi restoran.', smsChange: 'Tukar nombor', smsOk: 'Nombor disahkan',
      courier: (x) => `Penghantar ${x}`, kmToYou: (x) => `${x} km ke lokasi anda`,
      ordersEmpty: 'Pesanan anda akan muncul di sini', ordersHint: 'Pesanan dari telefon ini — di meja dan penghantaran — dalam 3 hari terakhir.',
      myData: 'Maklumat saya', profHint: 'Disimpan hanya di telefon ini supaya tidak perlu ditaip semula.', about: 'Tentang restoran', favsEmpty: 'Ketik ikon hati pada hidangan dan ia akan muncul di sini.',
      bkParts: { morning: 'Pagi', day: 'Tengah hari', evening: 'Makan malam', night: 'Malam' }, bkBig: 'Untuk kumpulan besar, lebih baik telefon', bkSendAt: (s) => `Tempah · ${s}`,
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
      svcBtn: '服务', callWaiter: '呼叫服务员', askBill: '买单', waiterComing: '服务员马上来', billComing: '账单马上送来',
      callSent: '服务员已收到呼叫，马上过来。', billSent: '服务员会把账单送过来。', callErr: '呼叫没有发出。请向服务员招手或重试。',
      payHow: '您想怎么付款？', payCash: '现金', payCard: '刷卡', payQr: '扫码支付',
      subtotal: '菜品', service: (p) => `服务费${p ? ` ${p}%` : ''}`, paid: '已付款',
      required: '必选', optional: '可选', addFor: (s) => `添加 · ${s}`, chooseOptions: '选择规格',
      edited: (x) => `餐厅在 ${x} 修改了您的订单`,
      wifi: 'Wi‑Fi', wifiNet: '网络', wifiPass: '密码', wifiNoPass: '无密码', wifiHint: '在手机设置中连接：Wi‑Fi → 这个网络 → 密码。', copy: '复制', copied: '已复制',
      receipt: '收据', receiptTitle: (n) => `收据 №${n}`, receiptSave: '保存或打印', receiptWait: '服务员结账后，收据会显示在这里。', receiptBack: '返回订单',
      rcDate: '日期', rcWaiter: '服务员', rcCashier: '收银员', rcOrders: '订单', rcDiscount: '折扣', rcRounding: '四舍五入', rcToPay: '应付', rcTip: '小费', rcPaidTotal: '实付合计', rcThanks: '感谢光临！', rcVerifyCode: '验证码', rcVerifyAt: '验证网址',
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
      // ---------- 应用 ----------
      tabHome: '首页', tabMenu: '菜单', tabOrders: '订单', tabProfile: '我的', back: '返回',
      howEat: '您想怎么用餐？', wayHere: '我在餐厅', wayHereSub: '用相机扫描桌上的二维码', wayHereAt: (x) => `${x} 号桌 — 打开菜单`,
      wayDelivery: '外送', wayDeliverySub: '送到您家门口', waySoon: '即将推出', wayBookSub: '选择日期和时间',
      recommend: '今日推荐', allMenu: '全部菜单',
      modeTable: (x) => `${x} 号桌 · 您在餐厅`, modeTableSub: '订单直接送到您的桌上', modeChange: '更换', modeExit: '退出',
      modeDv: '外送', modeDvKm: (km, fee) => `外送 · ${km} 公里 · ${fee}`, modeDvSub: '下单时填写地址并计算运费', modeEdit: '修改',
      modeBrowse: '浏览菜单', modeBrowseSub: '可在餐桌点餐，也可外送', modeChoose: '选择',
      howTitle: '您想怎么点餐？', howHint: '选择方式后菜品会自动加入。',
      tableExpired: '已超过 4 小时，桌号已失效。如需在餐厅点餐，请重新扫描二维码。',
      barTable: (x) => `${x} 号桌的订单`, barTableSub: '发送给服务员', barDvSub: '去结算外送', barBrowseSub: '请选择点餐方式',
      scanTitle: '餐桌二维码', scanHint: '将相机对准您桌上的二维码', scanStart: '打开相机', scanNoCam: '此设备无法使用相机。',
      scanDenied: '没有相机权限。请在浏览器设置中允许。', scanAlt: '或者用手机自带相机扫描桌上的二维码。',
      scanBad: '这不是本餐厅餐桌的二维码。', scanOk: (x) => `${x} 号桌 — 现在可以点餐`,
      dvAddr: '地址', dvAddrPh: '街道、楼号、单元、门牌', dvName: '姓名', dvNamePh: '怎么称呼您', dvNote: '备注', dvNotePh: '例如：到了请打电话',
      dvMe: '我的位置', dvPinHint: '点击地图标记送达地点', dvFrom: '距餐厅', dvKm: (x) => `${x} 公里`,
      dvPayCash: '现金', dvPayCard: '向骑手刷卡', dvPayCashC: '向骑手付现金',
      dvDishes: (n) => `菜品 · ${n}`, dvFeeUpTo: (km) => `外送 · ${km} 公里以内`, dvFee: '外送费',
      dvSend: (s) => `下外送订单 · ${s}`, dvMin: (s) => `外送最低消费 ${s}（不含外送费）。`,
      dvOff: '目前暂停外送。您可以在餐厅点餐。', dvTooFar: (km) => `该地点距离 ${km} 公里 — 暂时无法送达这么远。`,
      dvNeedPoint: '请在地图上标记送达地点。', dvNeedAddr: '请填写地址：街道、楼号、门牌（至少 5 个字符）。',
      dvBadReq: '请检查地址、姓名、电话和付款方式。', dvTooMany: '目前无法再接外送订单（此号码已有进行中的订单，或订单过多）。请稍后再试或致电餐厅。',
      dvGeoErr: '无法获取您的位置。请在地图上标记。', dvMapErr: '地图加载失败。请检查网络后重试。',
      dvSaveHint: '姓名、电话和地址会保存在这部手机上，下次无需重新填写。',
      cartEmpty: '购物车是空的', cartEmptyHint: '先从菜单添加菜品，再回到这里。', openMenu: '打开菜单', toDelivery: '去结算外送',
      trDv: (n) => `外送 · 订单 ${n} 号`, trTable: (x, n) => `${x} 号桌 · 订单 ${n} 号`,
      dvSt: { confirm: '等待餐厅来电', new: '等待确认', accepted: '餐厅已接单', cooking: '正在为您制作', ready: '订单已做好', on_the_way: '骑手正在路上', served: '已送达', cancelled: '订单已取消' },
      dvHint: { confirm: '餐厅会致电确认订单，确认后开始制作。', new: '餐厅已收到订单，很快会确认。', accepted: '我们很快开始制作。', cooking: '厨师正在制作您的订单。', ready: '订单已做好 — 正在等骑手。', on_the_way: '骑手正在给您送餐。', served: '祝您用餐愉快！', cancelled: '如有误，请致电餐厅。' },
      stWait: '等待确认', stAccepted: '餐厅已接单', stCooking: '制作中', stReady: '已做好 — 等待骑手', stWay: '配送中', stDone: '已送达',
      dvCallHint: (p) => `餐厅会致电 ${p} 确认订单，确认后开始制作。`, stCalled: '订单已确认',
      dvNoAnswer: '未能联系到您 — 订单已取消', dvNoAnswerHint: '餐厅没能打通您的电话。请重新下单或致电餐厅。',
      dvWillCall: '餐厅会致电确认您的订单。', dvMayCall: '餐厅可能会致电确认您的订单。',
      smsTitle: '验证手机号', smsWhy: '我们会发送短信验证码，让餐厅确认号码是您的。', smsSent: (p) => `验证码已发送至 ${p}`, smsSending: '正在发送验证码…',
      smsCode: '短信验证码', smsVerify: '确认', smsResend: '重新发送验证码', smsResendIn: (s) => `重新发送验证码（${s}）`,
      smsBad: (n) => `验证码错误，还剩 ${n} 次机会`,
      smsExpired: '验证码已过期 — 请重新发送。', smsTooMany: '错误次数过多 — 请重新发送验证码。',
      smsLimit: '发送到该号码的短信过多。请一小时后再试或致电餐厅。', smsBadPhone: '请检查号码：验证码只发送到马来西亚号码，例如 +60 12 345 6789。',
      smsOff: '目前无法发送短信。请致电餐厅。', smsFailed: '短信发送失败。请重试或致电餐厅。', smsChange: '更改号码', smsOk: '号码已验证',
      courier: (x) => `骑手 ${x}`, kmToYou: (x) => `距您 ${x} 公里`,
      ordersEmpty: '您的订单会显示在这里', ordersHint: '这部手机最近 3 天的订单 — 堂食和外送。',
      myData: '我的信息', profHint: '只保存在这部手机上，免得重复填写。', about: '关于餐厅', favsEmpty: '点击菜品上的爱心，它就会出现在这里。',
      bkParts: { morning: '早上', day: '午餐', evening: '晚餐', night: '夜间' }, bkBig: '人数较多时最好打电话预订', bkSendAt: (s) => `预订 · ${s}`,
    },
  };

  // ---------- Источники данных ----------
  const BASE = window.MENU;                 // data.js — если сервер не подключён
  const SCH = window.MenuSchedule;
  const B = window.MENU_BACKEND || {};
  // Бронь стола гостям не предлагаем (владелец, 2026-11-22): только заказ за столом по QR и доставка.
  const BOOKING = false;
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
        deliveryEnabled: false, deliveryLat: null, deliveryLng: null, deliveryZones: [], deliveryMin: 0, dvSms: false,
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
        // доставка: точка ресторана и зоны «до N км — цена»; без точки или без зон доставки нет
        ...(() => {
          const zones = (Array.isArray(st.delivery_zones) ? st.delivery_zones : [])
            .map((z) => ({ km: Number(z?.km), fee: Number(z?.fee) })).filter((z) => z.km > 0 && z.fee >= 0).sort((a, b) => a.km - b.km);
          const lat = st.delivery_lat == null ? null : Number(st.delivery_lat);
          const lng = st.delivery_lng == null ? null : Number(st.delivery_lng);
          const ok = !!st.delivery_enabled && Number.isFinite(lat) && Number.isFinite(lng) && lat !== null && lng !== null && zones.length > 0;
          return { deliveryEnabled: ok, deliveryLat: lat, deliveryLng: lng, deliveryZones: zones, deliveryMin: Number(st.delivery_min) || 0, dvSms: !!st.dv_sms };
        })(),
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
  // Телефон помнит стол 4 часа С МОМЕНТА СКАНИРОВАНИЯ и не продлевает их: раньше стол помнился «навсегда»,
  // и из дома можно было заказать «на стол 5».
  const TABLE_TTL = 4 * 60 * 60 * 1000;
  const TOKEN_RE = /^[a-f0-9]{20}$/;
  let tableToken = '';
  let tableAt = 0;            // когда отсканировали QR
  let table = '';             // название стола, подтверждённое сервером
  let tableState = 'none';    // none — нет кода | checking | ok | invalid | unknown (нет связи)
  let wifi = null;            // { name, pass } — приходит вместе со столом (только гостю за столом)
  let tableExpiredNote = false;
  const fromQrUrl = new URLSearchParams(location.search).has('t');
  {
    const p = new URLSearchParams(location.search);
    if (p.has('t')) {
      const fromUrl = (p.get('t') || '').trim().toLowerCase();
      tableToken = TOKEN_RE.test(fromUrl) ? fromUrl : '';
      tableState = tableToken ? 'checking' : 'invalid';
      tableAt = Date.now();
      store.set('table', tableToken ? { token: tableToken, at: tableAt } : null);
      if (tableToken) store.set('mode', null);   // за столом — не доставка
      // код убираем из адресной строки: перезагрузка или вкладка из истории не «продлевают» стол
      try {
        p.delete('t');
        const qs = p.toString();
        history.replaceState(history.state, '', location.pathname + (qs ? `?${qs}` : '') + (location.hash || ''));
      } catch { /* в некоторых обёртках адрес менять нельзя — не страшно */ }
    } else {
      const saved = store.get('table', null);
      const age = saved?.token ? Date.now() - Number(saved.at) : Infinity;
      if (saved?.token && TOKEN_RE.test(saved.token) && age >= 0 && age < TABLE_TTL) {
        tableToken = saved.token;
        tableAt = Number(saved.at);
        table = saved.label || '';
        tableState = 'checking';
      } else if (saved) {
        store.set('table', null);
        tableExpiredNote = saved.token && age < 24 * 60 * 60 * 1000;   // вчерашний стол — скажем один раз
      }
    }
  }
  const atTable = () => !!tableToken && tableState !== 'invalid' && tableState !== 'none';
  // доставка выбрана гостем (помним на телефоне); работает, только пока ресторан её включил
  let dvMode = store.get('mode', null) === 'delivery';
  const dvReady = () => ONLINE && !!M && !!R().deliveryEnabled;
  // режим: за столом (QR) · доставка · просто смотрим меню
  const mode = () => (atTable() ? 'table' : dvMode && dvReady() ? 'delivery' : 'browse');

  // Мои данные: имя, телефон, адрес и точка доставки — только на этом телефоне
  const str = (v, n) => String(v ?? '').slice(0, n);
  const numOrNull = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  let profile = (() => {
    const p = store.get('profile', null) || {};
    const bc = store.get('bookingContact', null) || {};
    const lat = numOrNull(p.lat);
    const lng = numOrNull(p.lng);
    return { name: str(p.name || bc.name, 60), phone: str(p.phone || bc.phone, 20), address: str(p.address, 300), lat: lat != null && lng != null ? lat : null, lng: lat != null && lng != null ? lng : null };
  })();
  const saveProfile = () => store.set('profile', profile);
  const PHONE_RE = /^\+?[0-9][0-9 ()-]{5,19}$/;

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
  let myOrders = (store.get('myOrders', []) || []).filter((o) => o && o.id && o.token && Date.now() - o.at < 3 * 24 * 60 * 60 * 1000);
  let tracked = store.get('tracked', {}) || {};     // id → последний ответ сервера по заказу
  let trackStale = false;
  let justSent = null;

  let query = '';
  let sheet = null;        // { type: 'dish', id } | { type: 'order' } | { type: 'lang' } | { type: 'hours' } | { type: 'how' } …
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

  // ---------- Общие куски разметки ----------
  function monogram(name) {
    const words = String(name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    return (words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase();
  }
  // блок перерисовываем, только если разметка изменилась: ничего не мигает, ряды не сбиваются
  function setHtml(el, html) {
    if (!el || el._html === html) return false;
    const rows = [...el.querySelectorAll('[data-keep-x]')].map((r) => [r.dataset.keepX, r.scrollLeft]);
    el.innerHTML = html;
    el._html = html;
    for (const [k, x] of rows) { const r = el.querySelector(`[data-keep-x="${k}"]`); if (r) r.scrollLeft = x; }
    return true;
  }
  // шапка экрана-подстраницы: «назад» и заголовок
  const subHead = (title, extra = '') => `<header class="htop"><button type="button" class="round back" data-act="back" aria-label="${esc(t('back'))}">${icon('back', 'flip')}</button><h1>${esc(title)}</h1>${extra}</header>`;
  const pageHead = (title) => `<header class="ptop"><h1>${esc(title)}</h1></header>`;
  const langBtn = () => (LANGS.length > 1 ? `<button type="button" class="lang-pill" data-sheet="lang" aria-label="${esc(`${t('language')}: ${t('langName')}`)}">${icon('globe', 'sm')}<span>${esc(lang.toUpperCase())}</span></button>` : '');
  function openPill() {
    const st = statusInfo();
    return `<button type="button" class="open-pill ${st.open ? 'ok' : 'off'}" data-sheet="hours" aria-label="${esc(`${st.text}. ${t('hours')}`)}"><span class="dot" aria-hidden="true"></span>${esc(st.text)}</button>`;
  }
  function halalPill() {
    const r = R();
    if (!r.halal) return '';
    return r.halalNote
      ? `<button type="button" class="open-pill halal" data-sheet="halal">${icon('check', 'sm')}${esc(t('halal'))}</button>`
      : `<span class="open-pill halal">${icon('check', 'sm')}${esc(t('halal'))}</span>`;
  }
  // адрес и телефон ресторана — только если ресторан их указал
  function infoLinks() {
    const r = R();
    const out = [];
    const addr = L(r.address);
    if (addr) {
      const q = r.address?.en || r.address?.ms || addr;
      const href = r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${q}`)}`;
      out.push(`<a class="row-link" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(`${t('openMap')}: ${addr}`)}">${icon('pin')}<span class="grow">${esc(addr)}</span>${icon('chevron', 'sm chev')}</a>`);
    }
    if (r.phone) {
      out.push(`<a class="row-link" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}" aria-label="${esc(`${t('call')}: ${r.phone}`)}">${icon('phone')}<span class="grow"><bdi dir="ltr">${esc(r.phone)}</bdi></span>${icon('chevron', 'sm chev')}</a>`);
    }
    return out.join('');
  }

  // ---------- Шапка страницы и общие подписи ----------
  function renderHeader() {
    document.documentElement.lang = lang;
    document.documentElement.dir = t('dir');
    $('#search').placeholder = t('search');
    $('#search-clear').setAttribute('aria-label', t('clearSearch'));
    $('#search-btn').setAttribute('aria-label', t('search'));
    $('#sheet-close').setAttribute('aria-label', t('close'));
    $('#m-title').textContent = t('menuWord');
    document.title = M ? `${R().name} — ${t('menuWord')}` : t('menuWord');
    $('#foot').textContent = M ? L(R().footer) : '';
    renderTabs();
    renderModeBanner();
    renderHome();
    if (route.name === 'profile') renderProfile();
  }

  // ---------- Нижние вкладки ----------
  const TAB_LIST = [['home', 'home', 'tabHome'], ['menu', 'book', 'tabMenu'], ['orders', 'bag', 'tabOrders'], ['profile', 'user', 'tabProfile']];
  const isActiveOrder = (o) => !!o && !['served', 'cancelled'].includes(o.status) && !o.paid_at;
  function renderTabs() {
    const on = TAB_LIST.some(([n]) => n === route.name) ? route.name : '';
    const live = myOrders.some((o) => isActiveOrder(tracked[o.id]));
    setHtml($('#tabbar'), TAB_LIST.map(([n, ic, k]) => `<button type="button" class="tab${n === on ? ' on' : ''}" data-act="go" data-to="${n}"${n === on ? ' aria-current="page"' : ''}>
      <span class="tab-ic">${icon(ic)}${n === 'orders' && live ? '<i class="tab-dot" aria-hidden="true"></i>' : ''}</span><span>${esc(t(k))}</span></button>`).join(''));
  }

  // ---------- Главная ----------
  function wayMain(act, ic, title, sub) {
    return `<button type="button" class="way main" data-act="${act}"><span class="way-ico">${icon(ic)}</span>
      <span class="way-txt"><b>${esc(title)}</b><span>${esc(sub)}</span></span><span class="way-go" aria-hidden="true">${icon('arrow', 'flip')}</span></button>`;
  }
  // способы заказать: за столом (QR) и доставка (или «скоро»); бронь — только если BOOKING
  function waysHtml(inSheet) {
    if (!ONLINE || !M) return '';
    const here = atTable() && !inSheet
      ? wayMain('way-here', 'check', t('wayHere'), t('wayHereAt')(table || '…'))
      : wayMain('way-here', 'qr', t('wayHere'), t('wayHereSub'));
    const dvOn = dvReady();
    const bk = BOOKING && !inSheet && (R().bookingsEnabled || !!booking);
    const dv = `<button type="button" class="way${dvOn ? '' : ' off'}${bk ? '' : ' wide'}" data-act="way-dv"${dvOn ? '' : ' disabled'}>
        <span class="way-ico">${icon('moto')}</span><b>${esc(t('wayDelivery'))}</b><span>${esc(dvOn ? t('wayDeliverySub') : t('waySoon'))}</span></button>`;
    const bkTile = bk ? `<button type="button" class="way" data-act="go" data-to="booking">
        <span class="way-ico">${icon('calendar')}</span><b>${esc(t('bkTitle'))}</b><span>${esc(bkActive() ? `${t('bkNo')(booking.no)} · ${bkWhen(booking.at)}` : t('wayBookSub'))}</span></button>` : '';
    return `<div class="ways">${here}${dv}${bkTile}</div>`;
  }
  // «Сегодня советуем»: блюда дня, потом хиты (по заказам и по отметке ресторана) — ничего не выдумываем
  function recList() {
    const out = [];
    for (const d of [...(M?.dishes || []).filter((x) => x.featured), ...hitsList()]) if (d?.available && !out.includes(d)) out.push(d);
    return out.slice(0, 8);
  }
  function renderHome() {
    const el = $('#scr-home');
    if (!M) {
      setHtml(el, state === 'error'
        ? `<div class="state" role="alert">${icon('alert')}<h2>${esc(t('loadError'))}</h2><p>${esc(t('loadErrorHint'))}</p><button type="button" class="btn" data-act="retry">${icon('refresh')}${esc(t('retry'))}</button></div>`
        : `<div class="home-skel" aria-busy="true"><p class="sr-only" role="status">${esc(t('loading'))}</p><div class="skel skel-hero"></div><div class="skel skel-way"></div><div class="skel skel-way"></div></div>`);
      return;
    }
    const r = R();
    const tag = L(r.tagline);
    const addr = L(r.address);
    const mark = r.logoUrl ? `<span class="mark-logo"><img src="${esc(r.logoUrl)}" alt=""></span>` : `<svg class="ic star8" aria-hidden="true"><use href="#i-star8"/></svg>`;
    const ways = waysHtml(false);
    const rec = recList();
    const recHtml = rec.length
      ? `<div class="h2"><h2>${esc(t('recommend'))}</h2><button type="button" class="link" data-act="go" data-to="menu">${esc(t('allMenu'))}</button></div>
        <div class="tiles" data-keep-x="rec">${rec.map(tile).join('')}</div>`
      : `<div class="info-list"><button type="button" class="row-link" data-act="go" data-to="menu">${icon('book')}<span class="grow">${esc(t('allMenu'))}</span>${icon('chevron', 'sm chev')}</button></div>`;
    const links = infoLinks();
    setHtml(el, `<div class="topbar"><div class="mark">${mark}<b>${esc(r.name)}</b></div>${langBtn()}</div>
      <section class="hero" aria-labelledby="r-name">
        ${tag ? `<p class="eyebrow">${esc(tag)}</p>` : ''}
        <h1 id="r-name">${esc(r.name)}</h1>
        ${addr ? `<p class="hero-addr">${esc(addr)}</p>` : ''}
        <div class="hero-pills">${openPill()}${halalPill()}</div>
      </section>
      ${ways ? `<div class="h2"><h2>${esc(t('howEat'))}</h2></div>${ways}` : ''}
      ${promos.length ? '<div class="promo" id="home-promo"></div>' : ''}
      ${recHtml}
      ${links ? `<div class="info-list">${links}</div>` : ''}
      ${L(r.footer) ? `<p class="home-foot">${esc(L(r.footer))}</p>` : ''}`);
    mountPromo();
  }

  // ---------- Рекламные ролики на главной (владелец загружает в панели «Реклама») ----------
  // Без звука и кнопок; один ролик — по кругу, несколько — по очереди. Видео живёт отдельно от HTML главной,
  // чтобы перерисовка (часы работы, язык) не начинала его заново. Ошибки — молча: просто нет ролика.
  let promos = [];
  let promoAt = 0;
  let promoVid = null;
  async function loadPromos() {
    if (!ONLINE) return;
    try {
      const list = await rest('promos?select=id,video_url,poster_url,title,sort,duration_s&active=eq.true&order=sort.asc,created_at.desc');
      const next = (Array.isArray(list) ? list : []).filter((p) => /^https:\/\//.test(p?.video_url || ''));
      if (JSON.stringify(next) === JSON.stringify(promos)) return;
      promos = next;
      promoAt = 0;
      if (promoVid) { promoVid.removeAttribute('src'); promoVid.load(); promoVid = null; }
      renderHome();
    } catch { /* без роликов */ }
  }
  function promoSrc(v) {
    const p = promos[promoAt];
    if (!p) return;
    v.loop = promos.length === 1;
    if (p.poster_url) v.poster = p.poster_url; else v.removeAttribute('poster');
    v.src = p.video_url;
    const slot = v.parentNode;
    if (slot) { const nm = L(p.title); if (nm) slot.setAttribute('aria-label', nm); else slot.removeAttribute('aria-label'); }
    if (!reduced()) v.play().catch(() => {});
  }
  function mountPromo() {
    const slot = $('#home-promo');
    if (!slot || !promos.length) return;
    if (!promoVid) {
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.autoplay = !reduced();
      v.preload = reduced() ? 'auto' : 'metadata';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('disablepictureinpicture', ''); v.setAttribute('aria-hidden', 'true');
      v.addEventListener('ended', () => { if (promos.length > 1) { promoAt = (promoAt + 1) % promos.length; promoSrc(v); } });
      // ролик не открылся — убираем его из очереди (без бесконечных повторов)
      v.addEventListener('error', () => {
        promos.splice(promoAt, 1);
        if (!promos.length) { promoVid = null; v.parentNode?.remove(); return; }
        promoAt %= promos.length;
        promoSrc(v);
      });
      promoVid = v;
      slot.appendChild(v);
      promoSrc(v);
      return;
    }
    if (promoVid.parentNode !== slot) slot.appendChild(promoVid);
    if (promoVid.paused && !reduced()) promoVid.play().catch(() => {});
  }

  // ---------- Карточки ----------
  // без фото — узор гирих (восьмиконечная звезда) на тёплом фоне; оттенок постоянный для каждого блюда
  const tint = (d) => { let h = 0; for (const ch of String(d?.id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 3) + 1; };
  const img = (d) => `<img src="${esc(d.photo)}" alt="" loading="lazy" decoding="async">`;
  function thumb(d, cls = '') {
    return `<span class="thumb tint-${tint(d)}${d?.photo ? ' has-img' : ''}${cls ? ` ${cls}` : ''}" aria-hidden="true">${d?.photo ? img(d) : ''}</span>`;
  }
  function tile(d) {
    return `<article class="tile tint-${tint(d)}${d.photo ? ' has-photo' : ''}" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
      <span class="tile-art${d.photo ? ' has-img' : ''}" aria-hidden="true">${d.photo ? img(d) : ''}</span>
      <span class="tile-slot slot" data-slot="${esc(d.id)}" data-kind="tile">${control(d.id, 'tile')}</span>
      <b class="tile-nm">${esc(L(d.name))}</b><span class="tile-pr">${priceHtml(d)}</span></article>`;
  }

  // метки: акция (с часами — «до 17:00»), «осталось 3», потом метки ресторана — тихим текстом
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
  const strip = (cls, id, title, list) => `<section class="strip ${cls}" aria-labelledby="${id}"><div class="sec"><h2 id="${id}">${esc(title)}</h2><i aria-hidden="true"></i></div>
    <div class="tiles" data-keep-x="${id}">${list.map(tile).join('')}</div></section>`;
  function favsHtml() {
    if (query || filterCount()) return '';
    const list = favs.map((id) => byId[id]).filter(Boolean);
    return list.length ? strip('favs', 'h-favs', t('favs'), list) : '';
  }
  // меняем только сердечки и ряд «Мои любимые» — остальное меню не перерисовываем
  function toggleFav(id, btn) {
    favs = isFav(id) ? favs.filter((x) => x !== id) : [id, ...favs];
    store.set('favs', favs);
    const anchor = [...document.querySelectorAll('#menu > section.cat')].find((x) => x.getBoundingClientRect().bottom > 0) || null;
    const top0 = anchor?.getBoundingClientRect().top;
    document.querySelectorAll('.fav-btn').forEach((b) => {
      const on = isFav(b.dataset.id);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', favLabel(b.dataset.id));
    });
    const old = $('#menu > .favs');
    const html = favsHtml();
    if (old) { if (html) old.outerHTML = html; else old.remove(); } else if (html) $('#menu > .hits, #menu > section.cat')?.insertAdjacentHTML('beforebegin', html);
    $('#menu')._html = null;
    if (route.name === 'menu' && anchor && document.contains(anchor)) {
      const dy = anchor.getBoundingClientRect().top - top0;
      if (dy) window.scrollBy({ top: dy, behavior: 'instant' });
    }
    if (route.name === 'profile') renderProfile();
    void btn;
  }

  // ---------- «Блюдо дня» ----------
  function dayHtml() {
    if (query || filterCount()) return '';
    const list = (M?.dishes || []).filter((d) => d.featured && d.available);
    if (!list.length) return '';
    if (list.length > 1) return strip('day-dish', 'h-day', t('dayDish'), list);
    const d = list[0];
    const desc = L(d.desc);
    return `<section class="strip day-dish" aria-labelledby="h-day"><div class="sec"><h2 id="h-day">${esc(t('dayDish'))}</h2><i aria-hidden="true"></i></div>
      <article class="feature" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        <span class="feature-art tint-${tint(d)}${d.photo ? ' has-img' : ''}" aria-hidden="true">${d.photo ? img(d) : ''}</span>
        <div class="feature-body"><h3>${esc(L(d.name))}</h3>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}${tagsHtml(d)}
          <div class="dfoot"><span class="dprice">${priceHtml(d)}${amount(d) ? `<small>${esc(amount(d))}</small>` : ''}</span><span class="slot" data-slot="${esc(d.id)}">${control(d.id)}</span></div>
        </div></article></section>`;
  }

  // кнопка у блюда: «+ Добавить» → терракотовые «− 1 +»; на плитке — круглый «+»
  function control(id, kind = '') {
    const dd = byId[id];
    const small = kind === 'tile';
    if (dd?.available && !catOpen(catOf(dd))) return `<span class="sold later">${esc(t('fromTime')(clock(catOf(dd).from)))}</span>`;
    if (!orderable(dd)) return small ? '' : `<span class="sold">${esc(t('soldOut'))}</span>`;
    const name = itemName(id);
    if (hasOptions(dd)) {
      const c = dishCount(id);
      return `<button type="button" class="${small ? 'plus' : 'addb'}${c ? ' has-n' : ''}" data-act="pick" data-id="${esc(id)}" aria-label="${esc(`${t('chooseOptions')}: ${name}`)}">${c ? `<span class="add-n">${c}</span>` : icon('plus')}${small ? '' : `<span>${esc(t('add'))}</span>`}</button>`;
    }
    const n = order[id] || 0;
    const plus = (cls) => `<button type="button"${cls} data-act="inc" data-id="${esc(id)}" aria-label="${esc(`${t('add')}: ${name}`)}">${icon('plus')}${cls && !small ? `<span>${esc(t('add'))}</span>` : ''}</button>`;
    if (!n) return plus(` class="${small ? 'plus' : 'addb'}"`);
    return `<div class="qty${small ? ' sm' : ''}"><button type="button" data-act="dec" data-id="${esc(id)}" aria-label="${esc(`${t('remove')}: ${name}`)}">${icon('minus')}</button><span aria-live="polite">${n}</span>${plus('')}</div>`;
  }

  // кнопки количества у строки корзины (строка = блюдо + варианты)
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
    const meta = [amount(d), d.prepMin ? t('prep')(d.prepMin) : ''].filter(Boolean).join(' · ');
    return `<article class="dish${d.available ? '' : ' is-sold'}" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        ${thumb(d)}
        <div class="dish-body">
          <h3>${esc(L(d.name))}</h3>
          ${compoHtml(d) || (desc ? `<p class="desc">${esc(desc)}</p>` : '')}
          ${tagsHtml(d)}
          <div class="dfoot"><span class="dprice">${priceHtml(d)}${meta ? `<small>${esc(meta)}</small>` : ''}</span><span class="slot" data-slot="${esc(d.id)}">${control(d.id)}</span></div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const main = $('#menu');
    const cats = $('#cats');
    if (state === 'loading' && !M) {
      cats.innerHTML = '';
      setHtml(main, `<p class="sr-only" role="status">${esc(t('loading'))}</p>${'<div class="skel skel-row"></div>'.repeat(5)}`);
      return;
    }
    if (state === 'error' && !M) {
      cats.innerHTML = '';
      setHtml(main, `<div class="state" role="alert">${icon('alert')}<h2>${esc(t('loadError'))}</h2>
        <p>${esc(t('loadErrorHint'))}</p><button type="button" class="btn" data-act="retry">${icon('refresh')}${esc(t('retry'))}</button></div>`);
      return;
    }

    // категория со временем подачи, которая сейчас подаётся (например, завтрак утром) — первой
    const groups = M.categories
      .map((c, i) => ({ c, i, items: M.dishes.filter((d) => d.category === c.id && matches(d)) }))
      .filter((g) => g.items.length)
      .sort((a, b) => ((b.c.from && catOpen(b.c)) - (a.c.from && catOpen(a.c))) || a.i - b.i);
    lastOpenSig = timeSig();

    const catsHtml = groups.map(({ c }) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(L(c.name))}</button>`).join('');
    if (cats._html !== catsHtml) { cats.innerHTML = catsHtml; cats._html = catsHtml; activeCat = null; }

    const offline = (stale ? `<p class="notice info" role="status">${icon('alert')}<span>${esc(t('offline'))}</span></p>` : '')
      + (ONLINE && tableState === 'invalid' ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('badTable'))}</span></p>` : '');
    let html;
    if (!M.dishes.length) {
      html = `${offline}<div class="state">${icon('dish')}<h2>${esc(t('emptyMenu'))}</h2><p>${esc(t('emptyMenuHint'))}</p></div>`;
    } else if (!groups.length) {
      html = `${offline}<div class="state">${icon('search')}<h2>${esc(t('nothing'))}</h2>
        <p>${esc(t('nothingHint'))}</p><button type="button" class="btn ghost" data-act="show-all">${esc(t('showAll'))}</button></div>`;
    } else {
      html = offline + dayHtml() + favsHtml() + hitsHtml() + groups.map(({ c, items }) => `
        <section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
          <div class="sec"><h2 id="h-${esc(c.id)}">${esc(L(c.name))}</h2><i aria-hidden="true"></i></div>
          ${c.from ? `<p class="cat-time${catOpen(c) ? ' now' : ''}">${icon('clock', 'sm')}${esc(catOpen(c) ? `${t('nowServing')} · ${clock(c.from)}–${clock(c.to)}` : t('servedAt')(clock(c.from), clock(c.to)))}</p>` : ''}
          <div class="list">${items.map(card).join('')}</div>
        </section>`).join('');
    }
    setHtml(main, html);
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
        if (changed) { renderMenu(); renderHome(); }
      }
    } catch { /* без рекомендаций */ }
  }
  function hitsList() {
    const ids = [...(stats.popular || []), ...(M?.dishes || []).filter((d) => (d.tags || []).includes('hit')).map((d) => d.id)];
    return [...new Set(ids)].map((id) => byId[id]).filter((d) => d && d.available).slice(0, 8);
  }
  function hitsHtml() {
    if (query || filterCount()) return '';
    const list = hitsList();
    return list.length < 3 ? '' : strip('hits', 'h-hits', t('hits'), list);
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
      ${thumb(d, 'sm')}<span class="grow"><b>${esc(L(d.name))}</b><small>${money(priceOf(d))}</small></span>
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
    if (route.name !== 'menu' || Date.now() < spyLockUntil) return;
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

  // сумма для режима: за столом — с сервисом и налогом; доставка — без сервиса, с налогом и доставкой
  const r2 = (x) => Math.round(Number(x) * 100) / 100;
  function dvTotals() {
    const { sum } = totals();
    const sen = Math.round(sum * 100);
    const tax = Math.round((sen * (Number(R().taxPct) || 0)) / 100 + 1e-9) / 100;   // как round(sub * tax_pct / 100, 2) на сервере
    const q = dv.quote?.ok ? dv.quote : null;
    const fee = q ? Number(q.fee) || 0 : 0;
    return { sub: sen / 100, service: 0, tax, fee, q, total: r2(sen / 100 + tax + fee) };
  }
  const modeTotal = () => {
    const m = mode();
    if (m === 'delivery') return dvTotals().total;
    return m === 'table' ? charges(totals().sum).total : r2(totals().sum);
  };

  // плашка внизу: «Заказ на стол 5 · Отправить официанту», «Доставка», «Мой заказ» — или статус последнего заказа
  function renderBar() {
    const bar = $('#order-bar');
    const onTab = route.name === 'menu' || route.name === 'home';
    if (!M || !onTab) { bar.hidden = true; document.body.classList.remove('has-bar'); return; }
    const { count } = totals();
    const last = count ? null : latestOrder();
    bar.classList.toggle('status-bar', !!last);
    if (count) {
      const m = mode();
      const tot = modeTotal();
      const title = m === 'table' ? t('barTable')(table || '…') : m === 'delivery' ? t('modeDv') : t('order');
      const sub = !ONLINE ? '' : m === 'table' ? t('barTableSub') : m === 'delivery' ? t('barDvSub') : t('barBrowseSub');
      bar.dataset.go = 'order';
      bar.innerHTML = `<span class="count">${count}</span><span class="bar-txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${attention ? '<span class="warn-dot" aria-hidden="true"></span>' : ''}<span class="bar-sum"><bdi dir="ltr">${money(tot)}</bdi></span>`;
      bar.setAttribute('aria-label', `${title}: ${count}, ${t('total')} ${money(tot)}`);
      roll('bar', [bar.querySelector('.bar-sum bdi')], tot);
    } else if (last) {
      const kind = last.kind || last.data.kind || 'table';
      const txt = statusText(last.data, kind);
      bar.dataset.go = 'track:' + last.id;
      bar.innerHTML = `<span class="count">${icon(kind === 'delivery' ? 'moto' : 'list', 'sm')}</span><span class="bar-txt"><b>${esc(t('orderNo')(last.no))}</b><small>${esc(txt)}</small></span><span class="bar-go" aria-hidden="true">${icon('chevron', 'flip-rtl')}</span>`;
      bar.setAttribute('aria-label', `${t('orderNo')(last.no)}: ${txt}`);
    }
    if (!count) delete rolls.bar;
    bar.hidden = !count && !last;
    document.body.classList.toggle('has-bar', !bar.hidden);
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
      const p = Math.min(1, (now - t0) / 300);
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

  function remember(key) {
    const { id, opts } = parseKey(key);
    const d = byId[id];
    if (d) seen[key] = { price: optInfo(d, opts).unit, name: d.name };
    store.set('seen', seen);
  }

  function refreshSlots() {
    document.querySelectorAll('[data-slot]').forEach((el) => { el.innerHTML = control(el.dataset.slot, el.dataset.kind); });
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
    if (route.name === 'delivery') updateDelivery();
    return n > was;
  }

  // Почему сейчас нельзя отправить заказ на стол (пустая строка — можно)
  function orderBlocker() {
    if (!ONLINE) return t('noServer');
    if (tableState === 'none') return t('noTable');
    if (tableState === 'invalid') return t('badTable');
    if (!R().ordersEnabled) return t('ordersOff');
    if (!R().ordersWhenClosed && !SCH.status(R().schedule, R().timezone).open) return `${t('closedNoOrders')} ${statusInfo().text}.`;
    if (lines().some((l) => !l.ok)) return t('removeSold');
    return '';
  }
  const kmText = (x) => new Intl.NumberFormat(t('locale'), { maximumFractionDigits: 1 }).format(Number(x) || 0);
  // Почему сейчас нельзя заказать доставку (пустая строка — можно). Имя, телефон и адрес проверяем при отправке.
  function dvBlocker() {
    if (!ONLINE) return t('noServer');
    if (!dvReady() || !R().ordersEnabled) return t('dvOff');
    if (!R().ordersWhenClosed && !SCH.status(R().schedule, R().timezone).open) return `${t('closedNoOrders')} ${statusInfo().text}.`;
    if (lines().some((l) => !l.ok)) return t('removeSold');
    if (profile.lat == null) return t('dvNeedPoint');
    const q = dv.quote;
    if (q && !q.ok) {
      if (q.reason === 'too_far') return t('dvTooFar')(kmText(q.km));
      if (q.reason === 'off') return t('dvOff');
      if (q.reason === 'net') return `${t('loadError')}. ${t('loadErrorHint')}`;
      return t('dvNeedPoint');
    }
    const min = q?.ok ? Number(q.min) || 0 : Number(R().deliveryMin) || 0;
    if (min > 0 && lines().length && dvTotals().sub < min) return t('dvMin')(money(min));
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

  // корзина (шторка): строки, пожелания, комментарий; низ зависит от режима
  function orderSheetHtml() {
    const ls = lines();
    const m = mode();
    const out = [`<h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2>`];
    if (m === 'table') out.push(`<p class="mode-line is-table">${icon('check', 'sm')}<span>${esc(t('modeTable')(table || '…'))}</span></p>`);
    else if (m === 'delivery') out.push(`<p class="mode-line is-dv">${icon('moto', 'sm')}<span>${esc(t('modeDv'))}</span></p>`);
    if (!ls.length) {
      out.push(`<div class="state">${icon('bag')}<p>${esc(t('orderEmpty'))}</p></div>`);
      return out.join('');
    }
    const gone = ls.filter((l) => !l.ok);
    if (gone.length) out.push(`<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('unavailableNotice')(gone.map((l) => lineName(l.key)).join(', ')))}</span></p>`);
    if (priceChanges.length) {
      const txt = priceChanges.map((p) => `${lineName(p.key)} ${money(p.from)} → ${money(p.to)}`).join('; ');
      out.push(`<p class="notice" role="status">${icon('alert')}<span>${esc(t('priceNotice')(txt))}</span></p>`);
    }
    // строку можно смахнуть влево — под ней терракотовая кнопка «Удалить»
    out.push(`<ul class="cart-list">${ls.map(({ key, id, n, d, ok, unit, names }) => `
      <li class="cart-line${ok ? '' : ' gone'}" data-line="${esc(key)}">
        <button type="button" class="swipe-del" data-act="swipe-del" data-key="${esc(key)}" tabindex="-1" aria-hidden="true">${icon('trash')}<span>${esc(t('del'))}</span></button>
        <div class="cl-row">
        ${thumb(d, 'sm')}
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
    if (m === 'delivery') { const c = dvTotals(); out.push(chargesHtml({ sub: c.sub, service: 0, tax: c.tax, total: r2(c.sub + c.tax) }, true)); }
    else if (m === 'table') out.push(chargesHtml(charges(totals().sum), true));
    else out.push(chargesHtml({ sub: totals().sum, service: 0, tax: 0, total: r2(totals().sum) }, false));
    out.push(`<button type="button" class="link-clear" data-act="clear">${icon('trash', 'sm')}${esc(t('clear'))}</button>`);

    // закреплённый низ: причина, ошибка, кнопка
    const foot = [];
    if (!ONLINE) {
      foot.push(`<p class="notice" role="status">${icon('alert')}<span>${esc(t('noServer'))}</span></p>`);
    } else if (m === 'table') {
      const block = orderBlocker();
      if (block) foot.push(`<p class="notice ${tableState === 'invalid' ? 'bad' : ''}" role="status">${icon('alert')}<span>${esc(block)}</span></p>`);
      else if (tableState === 'checking') foot.push(`<p class="notice info" role="status">${icon('refresh')}<span>${esc(t('checkingTable'))}</span></p>`);
      if (sendError) foot.push(`<p class="notice bad" role="alert">${icon('alert')}<span>${esc(sendError)}</span></p>`);
      foot.push(`<button type="button" class="btn block send-btn" data-act="send"${block || sending ? ' disabled' : ''}>
        ${sending ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('sending'))}</span>` : `<span>${esc(t('sendOrder'))}</span><span class="send-sum"><bdi dir="ltr">${money(charges(totals().sum).total)}</bdi></span>`}</button>`);
    } else if (m === 'delivery') {
      foot.push(`<button type="button" class="btn block send-btn" data-act="to-delivery"><span>${esc(t('toDelivery'))}</span>${icon('arrow', 'flip')}</button>`);
    } else {
      foot.push(`<p class="sheet-desc how-q">${esc(t('howTitle'))}</p>${waysHtml(true)}`);
    }
    out.push(`<div class="sheet-actions">${foot.join('')}</div>`);
    return out.join('');
  }

  const timeOf = (iso) => new Intl.DateTimeFormat(t('locale'), { hour: '2-digit', minute: '2-digit', hour12: lang === 'en' }).format(new Date(iso));
  const dayTimeOf = (iso) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today ? timeOf(iso) : `${new Intl.DateTimeFormat(t('locale'), { day: 'numeric', month: 'short' }).format(d)}, ${timeOf(iso)}`;
  };
  // в ресторане всё просто: заказ отправлен → подан (или отменён). Без «принят / готовится / готово» (правило владельца).
  const guestStatus = (s) => (['served', 'cancelled'].includes(s) ? s : 'new');
  // доставка: свои этапы — (ждём звонка ресторана) → ждём подтверждения → приняли → готовим → в пути → доставлено
  const DV_STATUSES = ['confirm', 'new', 'accepted', 'cooking', 'ready', 'on_the_way', 'served', 'cancelled'];
  // телефон как на сервере (phone_e164): +60… для Малайзии; не похоже на номер — ''
  const e164 = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    const e0 = /^\s*\+/.test(String(p || '')) ? `+${d}` : d.startsWith('00') ? `+${d.slice(2)}` : d.startsWith('60') ? `+${d}` : d.startsWith('0') ? `+60${d.slice(1)}` : '';
    const e = e0.replace(/^\+600/, '+60');   // «+60 012…»: местный 0 после кода страны лишний (как phone_e164 в базе)
    return /^\+[1-9]\d{7,14}$/.test(e) ? e : '';
  };
  const ltr = (x) => `\u2066${x}\u2069`;   // номер внутри арабского текста не переворачивается
  // доставку отменили, потому что не дозвонились
  const noAnswer = (o) => o?.status === 'cancelled' && o.cancel_reason === 'no_answer';
  const dvStatus = (s) => (DV_STATUSES.includes(s) ? s : 'new');
  function statusText(o, kind) {
    if (!o) return '';
    if (kind !== 'delivery') return t('statuses')[guestStatus(o.status)];
    const s = dvStatus(o.status);
    return s === 'cancelled' ? (noAnswer(o) ? t('dvNoAnswer') : t('statuses').cancelled)
      : s === 'confirm' ? t('dvSt').confirm
        : s === 'new' ? t('stWait') : s === 'ready' ? t('stReady') : s === 'on_the_way' ? t('stWay') : s === 'served' ? t('stDone') : t('stCooking');
  }
  const stKind = (o, kind) => {
    const s = o?.status;
    if (s === 'cancelled') return 'off';
    if (s === 'served') return 'ok';
    return kind === 'delivery' && s !== 'new' && s !== 'confirm' ? 'go' : 'wait';
  };

  // шаги доставки — как на макете: точка, линия, время там, где оно известно
  function dvStepsHtml(o, call) {
    const s = dvStatus(o.status);
    const rank = { confirm: -1, new: 0, accepted: 1, cooking: 1, ready: 2, on_the_way: 3, served: 4 }[s] ?? 0;
    // имя курьера — в карточке ниже; здесь только расстояние, как на макете
    const way = o.distance_km != null ? t('kmToYou')(kmText(o.distance_km)) : '';
    const steps = [
      // первым шагом — звонок ресторана, если заказ его ждал
      ...(s === 'confirm' || call ? [{ b: s === 'confirm' ? t('dvSt').confirm : t('stCalled'), done: rank >= 0, now: s === 'confirm' }] : []),
      { b: rank >= 1 ? t('stAccepted') : t('stWait'), at: o.accepted_at, done: rank >= 1, now: rank === 0 },
      { b: s === 'ready' ? t('stReady') : t('stCooking'), done: rank >= 3, now: rank === 1 || rank === 2 },
      { b: t('stWay'), small: rank === 3 ? way : '', at: o.picked_at, done: rank >= 4, now: rank === 3 },
      { b: t('stDone'), at: o.served_at, done: rank >= 4, now: false },
    ];
    return `<ol class="steps">${steps.map((x) => `<li class="st${x.done ? ' done' : x.now ? ' now' : ''}"${x.now ? ' aria-current="step"' : ''}>
      <span class="dot" aria-hidden="true">${x.done ? icon('check') : ''}</span>
      <b>${esc(x.b)}${x.small ? `<small>${esc(x.small)}</small>` : ''}</b><em>${x.at && (x.done || x.now) ? esc(timeOf(x.at)) : ''}</em></li>`).join('')}</ol>`;
  }

  // ---------- «Где мой заказ» (экран) ----------
  function trackHtml(id) {
    const o = tracked[id];
    const mine = myOrders.find((x) => x.id === id);
    if (!o || !mine) {
      return `${subHead(t('order'))}<div class="state">${mine ? '<span class="spinner" aria-hidden="true"></span>' : `${icon('alert')}<p>${esc(t('errServer'))}</p>`}
        <button type="button" class="btn ghost" data-act="go" data-to="orders">${esc(t('myOrders'))}</button></div>`;
    }
    const kind = o.kind || mine.kind || 'table';
    const dvk = kind === 'delivery';
    const gs = dvk ? dvStatus(o.status) : guestStatus(o.status);
    const callPhone = dvk ? (mine.phone || e164(profile.phone)) : '';
    const head = dvk ? (noAnswer(o) ? t('dvNoAnswer') : t('dvSt')[gs]) : t('statuses')[gs];
    const hint = !dvk ? t('statusHint')[gs] : noAnswer(o) ? t('dvNoAnswerHint')
      : gs === 'confirm' && callPhone ? t('dvCallHint')(ltr(callPhone)) : t('dvHint')[gs];
    const sentNow = justSent === id && o.status === 'new';
    const items = (o.items || []).map((i) => {
      const on = (i.opts || []).map((x) => L(x.name)).filter(Boolean);
      return `<li><span class="o-name"><b>${esc(L(i.name) || i.id)}${Number(i.qty) > 1 ? ` <span class="x">× ${Number(i.qty)}</span>` : ''}</b>${on.length ? `<em class="o-opts">${esc(on.join(', '))}</em>` : ''}${i.note ? `<span class="dn-show static"><span class="dn-mark" aria-hidden="true">!</span><span>${esc(i.note)}</span></span>` : ''}</span><b class="o-sum">${money(i.price * i.qty)}</b></li>`;
    }).join('');
    const sub = Number(o.subtotal ?? o.total) || 0;
    const r = R();
    const sumRows = [
      Number(o.service) ? `<div><span>${esc(t('service')(''))}</span><b>${money(o.service)}</b></div>` : '',
      Number(o.tax) ? `<div><span>${esc(r.taxName || 'SST')}</span><b>${money(o.tax)}</b></div>` : '',
      dvk ? `<div><span>${esc(t('dvFee'))}</span><b>${money(o.delivery_fee || 0)}</b></div>` : '',
    ].join('');
    const payTxt = o.paid_at ? t('paid') : o.pay_method === 'card' ? t('dvPayCard') : t('dvPayCashC');
    const courier = dvk && o.courier_name && ['on_the_way', 'served'].includes(o.status)
      ? `<div class="courier"><span class="ava" aria-hidden="true">${esc(monogram(o.courier_name).slice(0, 1))}</span><b>${esc(t('courier')(o.courier_name))}<small>${esc(`${payTxt} · ${money(o.total)}`)}</small></b></div>` : '';
    const where = dvk && o.address
      ? `<p class="where">${icon('pin', 'sm')}<span>${esc(o.address)}${o.distance_km != null ? ` · ${esc(t('dvKm')(kmText(o.distance_km)))}` : ''}</span></p>` : '';
    return `${subHead(t('order'))}
      <section class="track-card is-${stKind(o, kind)}${sentNow ? ' sent' : ''}" aria-live="polite">
        <p class="no">${esc(dvk ? t('trDv')(o.no) : t('trTable')(o.table_label, o.no))}</p>
        <h2>${esc(head)}</h2>
        <p class="hint">${esc(hint)}</p>
        ${dvk && gs !== 'cancelled' ? dvStepsHtml(o, !!mine.call) : `<p class="t-meta">${icon(gs === 'served' ? 'check' : gs === 'cancelled' ? 'x' : 'clock', 'sm')}<span>${esc(t('sentAt')(timeOf(o.created_at)))}</span>${o.paid_at ? `<span class="paid-tag">${icon('check', 'sm')}${esc(t('paid'))}</span>` : ''}</p>`}
        ${where}
      </section>
      ${courier}
      ${trackStale ? `<p class="notice info">${icon('alert')}<span>${esc(t('statusStale'))}</span></p>` : ''}
      ${o.edited_at ? `<p class="notice info">${icon('refresh')}<span>${esc(t('edited')(timeOf(o.edited_at)))}</span></p>` : ''}
      <section class="sum-card">
        <ul class="track-list">${items}</ul>
        <div class="sum-rows">${sumRows ? `<div><span>${esc(t('subtotal'))}</span><b>${money(sub)}</b></div>${sumRows}` : ''}<div class="tot"><span>${esc(t('total'))}</span><b>${money(o.total)}</b></div></div>
      </section>
      ${o.note ? `<p class="notice info">${icon('list')}<span><b>${esc(t('note'))}:</b> ${esc(o.note)}</span></p>` : ''}
      ${reviewHtml(id, o)}
      <div class="track-actions">
        ${o.paid_at ? `<button type="button" class="btn ghost" data-act="receipt" data-id="${esc(id)}">${icon('list', 'sm')}<span>${esc(t('receipt'))}</span></button>` : ''}
        ${o.status !== 'cancelled' ? `<button type="button" class="btn soft" data-act="repeat" data-id="${esc(id)}">${icon('refresh', 'sm')}<span>${esc(t('repeat'))}</span></button>` : ''}
        <button type="button" class="btn ghost" data-act="go" data-to="menu"><span>${esc(t('orderMore'))}</span></button>
      </div>`;
  }
  function renderTrack() {
    if (route.name !== 'track') return;
    setHtml($('#scr-track'), trackHtml(route.arg));
  }

  // ---------- Чек в телефоне ----------
  async function openReceipt(id) {
    const mine = myOrders.find((x) => x.id === id);
    if (!mine) return;
    openSheet({ type: 'receipt', id, data: undefined });
    let data = null;
    try { data = await rpc('guest_receipt', { p_order: id, p_token: mine.token }); } catch { data = 'error'; }
    // QR «Проверить чек» — библиотека QR грузится только сейчас; без неё на чеке остаются код и адрес
    if (data && data !== 'error' && data.verify_key && window.ReceiptQR) await window.ReceiptQR.load();
    if (sheet?.type === 'receipt' && sheet.id === id) { sheet.data = data; renderSheet(); }
  }
  function receiptHtml() {
    const back = `<button type="button" class="btn ghost" data-act="close-sheet">${esc(t('receiptBack'))}</button>`;
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
          ${b.kind === 'delivery' ? row(t('modeDv'), '') : row(t('table'), b.table_label)}
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
          ${n('delivery_fee') ? row(t('dvFee'), num(n('delivery_fee'))) : ''}
        </div>
        ${row(t('total'), cur(n('total')), 'rc-total')}
        ${n('rounding') ? `<div class="rc-block">${row(t('rcRounding'), `${n('rounding') > 0 ? '+' : '−'}${num(Math.abs(n('rounding')))}`)}${row(t('rcToPay'), cur(n('total') + n('rounding')))}</div>` : ''}
        <div class="rc-block">
          ${n('tip') ? row(t('rcTip'), num(n('tip'))) : ''}
          ${pays.map((p) => row(`${t('paid')}: ${t('rcPay')[p.method] || p.method}`, cur(p.amount))).join('')}
          ${pays.length > 1 || n('tip') ? row(t('rcPaidTotal'), cur(n('total') + n('tip') + n('rounding')), 'rc-strong') : ''}
        </div>
        <p class="rc-thanks">${esc(t('rcThanks'))}</p>
        ${b.id && b.verify_key && window.ReceiptQR ? receiptVerifyHtml(b) : ''}
      </article>
      <div class="track-actions rc-actions">
        <button type="button" class="btn" data-act="receipt-print">${icon('download', 'sm')}<span>${esc(t('receiptSave'))}</span></button>
        ${back}
      </div>`;
  }
  // QR на оригинал чека в базе + код проверки: подделку в фотошопе видно на verify.html
  function receiptVerifyHtml(b) {
    const Q = window.ReceiptQR;
    const link = Q.url(b.id, b.verify_key);
    return `<div class="rc-verify">
        ${Q.svg(link, { cls: 'rc-qr', color: '#24190F', label: t('rcVerifyCode') })}
        <div class="rc-vcode"><span>${esc(t('rcVerifyCode'))}</span> <b dir="ltr">${esc(Q.code(b.verify_key))}</b></div>
        <a class="rc-vlink" href="${esc(link)}" target="_blank" rel="noopener"><span>${esc(t('rcVerifyAt'))}:</span> <bdi dir="ltr">${esc(Q.short())}</bdi></a>
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
  let starsLit = false;           // гость только что поставил оценку
  let thanksFor = null;           // отзыв только что ушёл — «спасибо» появляется мягко
  function reviewHtml(id, o) {
    // за столом — можно уже за едой; доставку — когда её привезли
    const can = o.kind === 'delivery' ? o.status === 'served' || !!o.paid_at : ['served', 'ready', 'cooking'].includes(o.status) || !!o.paid_at;
    if (!ONLINE || !can) return '';
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
    const anim = starsLit ? ' lit' : '';
    starsLit = false;
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
    renderTrack();
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
    renderTrack();
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
    if (added) {
      if (route.name !== 'menu') go('menu');
      openSheet({ type: 'order' });
      toast(skipped ? t('repeatSome') : t('repeatDone')(added), skipped ? '' : 'good');
    } else toast(t('repeatSome'), 'bad');
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
    const show = ONLINE && atTable() && (route.name === 'menu' || route.name === 'home');
    el.hidden = !show;
    document.body.classList.toggle('has-dock', show);
    if (!show) { el.innerHTML = ''; return; }
    // сразу после успешного вызова кнопка на пару секунд становится галочкой «Официант уже идёт» / «Счёт несут»
    const just = (k) => callJust?.kind === k && Date.now() < callJust.until;
    const morph = (k) => { if (!just(k) || callJust.played) return ''; callJust.played = true; return ' morph'; };
    // одна спокойная кнопка «Сервис» внизу; внутри — официант, счёт, Wi‑Fi, бронь
    const kind = just('waiter') ? 'waiter' : just('bill') ? 'bill' : openCalls.bill ? 'bill' : openCalls.waiter ? 'waiter' : '';
    const label = just('waiter') ? t('callDone') : just('bill') ? t('billDone') : openCalls.bill ? t('billComing') : openCalls.waiter ? t('waiterComing') : t('svcBtn');
    el.innerHTML = `<button type="button" class="service-btn${kind ? ' on' : ''}${kind && just(kind) ? morph(kind) : ''}" data-act="service" aria-label="${esc(label)}">${icon(kind ? 'check' : 'bell')}<span>${esc(label)}</span></button>`;
    if (sheet?.type === 'service') renderSheet();
  }
  function callsHtml() {
    return `<div class="svc-list">
      <button type="button" class="call-btn${openCalls.waiter ? ' on' : ''}" data-act="call-waiter"${calling ? ' disabled' : ''}>${icon(openCalls.waiter ? 'check' : 'bell')}<span>${esc(openCalls.waiter ? t('waiterComing') : t('callWaiter'))}</span>${icon('chevron', 'sm chev')}</button>
      <button type="button" class="call-btn${openCalls.bill ? ' on' : ''}" data-act="call-bill"${calling ? ' disabled' : ''}>${icon(openCalls.bill ? 'check' : 'list')}<span>${esc(openCalls.bill ? t('billComing') : t('askBill'))}</span>${icon('chevron', 'sm chev')}</button>
      ${wifi ? `<button type="button" class="call-btn" data-sheet="wifi">${icon('wifi')}<span>${esc(t('wifi'))}</span>${icon('chevron', 'sm chev')}</button>` : ''}
    </div>`;
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
      if (/bad_table/.test(m)) { forgetTable(); tableState = 'invalid'; if (sheet) closeSheet(); renderAll(); }
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
  // строки корзины в том виде, как их ждут place_order и place_delivery
  const itemsPayload = () => lines().map((l) => ({ id: l.id, qty: l.n, price: l.unit, ...(l.opts.length ? { opts: l.opts } : {}), ...(dishNotes[l.key]?.trim() ? { note: dishNotes[l.key].trim().slice(0, 120) } : {}) }));
  // 1) свежие цены и наличие: если что-то изменилось — показываем гостю и НЕ отправляем
  async function freshCheck() {
    const before = JSON.stringify(lines().map((l) => [l.key, l.ok, l.unit]));
    const fresh = await refreshMenu(true);
    if (!fresh) throw Object.assign(new Error('network'), { net: true });
    return JSON.stringify(lines().map((l) => [l.key, l.ok, l.unit])) === before;
  }
  // сервер подтвердил — только теперь «отправлен»: запоминаем заказ, чистим корзину, открываем «Где мой заказ»
  function placed(o, kind, extra = {}) {
    myOrders = [{ id: o.id, token: o.guest_token, no: o.no, at: Date.now(), kind, ...(o.status === 'confirm' ? { call: true } : {}), ...extra }, ...myOrders.filter((x) => x.id !== o.id)].slice(0, 20);
    tracked[o.id] = { ...o, kind, table_label: o.table_label || (kind === 'delivery' ? '' : table), updated_at: o.created_at };
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
    if (sheet) closeSheet();
    go('track', o.id, route.name === 'delivery');
    schedulePoll(true);
  }
  // ошибка сервера → понятный гостю текст (и свежее меню, если дело в нём)
  async function orderErr(e, kind) {
    const m = String(e?.message || '');
    const dvk = kind === 'delivery';
    if (e?.net) return t('errNetwork');
    if (/sold_out/.test(m)) {
      // порций осталось меньше, чем в заказе: свежее меню и точная подсказка, сколько осталось
      await refreshMenu(true);
      const d = byId[(m.match(/sold_out:([^\s"]+)/) || [])[1]];
      return d && d.stock > 0 ? t('errStockLeft')(L(d.name), d.stock) : t('errChanged');
    }
    if (/price_changed|unavailable|options|not_now|bad_items/.test(m)) { await refreshMenu(true); return t('errChanged'); }
    if (!dvk && /bad_table/.test(m)) { forgetTable(); tableState = 'invalid'; return ''; }
    if (dvk && /delivery_off/.test(m)) { await refreshMenu(true); return t('dvOff'); }
    if (/closed|orders_off/.test(m)) { await refreshMenu(true); return dvk ? dvBlocker() || t('dvOff') : ''; }
    if (/too_many/.test(m)) return dvk ? t('dvTooMany') : t('errTooMany');
    if (dvk && /too_far|bad_point|below_min/.test(m)) { await quote(); return dvBlocker() || t('dvBadReq'); }
    if (dvk && /bad_request|empty/.test(m)) return t('dvBadReq');
    return t('errServer');
  }

  async function sendOrder() {
    if (sending || !lines().length || orderBlocker()) { renderSheet(); return; }
    sending = true;
    sendError = '';
    renderSheet();
    try {
      if (!(await freshCheck())) { sendError = t('errChanged'); return; }
      if (orderBlocker()) return;
      // 2) один ключ на одну попытку: повторное нажатие и плохой интернет не создадут второй заказ
      const sig = cartSig();
      if (!pendingKey || pendingKey.sig !== sig) {
        pendingKey = { key: uuid(), sig };
        store.set('pendingKey', pendingKey);
      }
      const rows = await rpc('place_order', {
        p_table: tableToken,
        p_items: itemsPayload(),
        p_note: note.trim() || null,
        p_lang: lang,
        p_client_key: pendingKey.key,
      });
      const o = Array.isArray(rows) ? rows[0] : rows;
      if (!o?.id || !o.guest_token) throw new Error('bad_reply');
      sending = false;
      placed(o, 'table');
    } catch (e) {
      sendError = await orderErr(e, 'table');
    } finally {
      sending = false;
      renderHeader();
      renderBar();
      renderTableActions();
      renderSheet();
    }
  }

  // ---------- Статус своих заказов ----------
  let pollTimer = null;
  async function pollOrders() {
    if (!ONLINE) return;
    // последние сутки — все (чек, отзыв); старше — только незавершённые
    const recent = myOrders.filter((o) => Date.now() - o.at < 24 * 60 * 60 * 1000 || !tracked[o.id] || isActiveOrder(tracked[o.id])).slice(0, 8);
    if (!recent.length) return;
    let ok = true;
    let changed = false;
    const gone = [];
    await Promise.all(recent.map(async (o) => {
      try {
        const rows = await rpc('get_order', { p_id: o.id, p_token: o.token });
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) { gone.push(o.id); return; }  // сервер не знает такой заказ (старше 3 дней или другая база)
        if (row.status === 'confirm' && !o.call) { o.call = true; store.set('myOrders', myOrders); }
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
    }
    if (trackStale === ok) changed = true;
    trackStale = !ok;
    if (changed) {
      store.set('tracked', tracked);
      renderBar();
      renderTabs();
      if (route.name === 'track') renderTrack();
      if (route.name === 'orders') renderOrders();
    }
  }
  function schedulePoll(soon) {
    clearTimeout(pollTimer);
    if (!ONLINE || !myOrders.length) return;
    const active = myOrders.some((o) => isActiveOrder(tracked[o.id]));
    pollTimer = setTimeout(async () => {
      if (!document.hidden) await pollOrders();
      schedulePoll();
    }, soon ? 3000 : active ? 10000 : 60000);
  }

  // ---------- Стол ----------
  async function tableInfo(token) {   // { label, wifi } | null — нет такого стола; без связи — исключение
    const rows = await rpc('table_info', { p_token: token });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row?.label ? { label: row.label, wifi: row.wifi_name ? { name: row.wifi_name, pass: row.wifi_pass || '' } : null } : null;
  }
  // забыть стол: вышли сами, прошло 4 часа или сервер сказал, что кода больше нет
  function forgetTable() {
    tableToken = '';
    tableAt = 0;
    table = '';
    wifi = null;
    tableState = 'none';
    openCalls = { waiter: false, bill: false, reasons: [] };
    clearTimeout(callsTimer);
    store.set('table', null);
  }
  function setTable(token, info) {
    tableToken = token;
    tableAt = Date.now();
    table = info.label;
    wifi = info.wifi;
    tableState = 'ok';
    store.set('table', { token, at: tableAt, label: table });
    dvMode = false;
    store.set('mode', null);
    pollCalls().then(scheduleCalls);
  }
  async function checkTable() {
    if (!ONLINE || !tableToken) { if (!tableToken && tableState !== 'invalid') tableState = 'none'; return; }
    const token = tableToken;
    try {
      const info = await tableInfo(token);
      if (token !== tableToken) return;   // пока ждали, гость отсканировал другой стол
      if (info) {
        table = info.label;
        wifi = info.wifi;
        tableState = 'ok';
        // время сканирования НЕ продлеваем — через 4 часа стол забудется
        store.set('table', { token, at: tableAt, label: table });
        pollCalls().then(scheduleCalls);
      } else {
        forgetTable();
        tableState = 'invalid';
      }
    } catch {
      tableState = 'unknown'; // нет связи: проверит сервер при отправке
    }
    renderAll();
  }
  // 4 часа со сканирования прошли, пока страница была открыта
  function expireTable() {
    if (!tableToken || Date.now() - tableAt < TABLE_TTL) return false;
    forgetTable();
    toast(t('tableExpired'));
    renderAll();
    return true;
  }

  // ---------- Бронь стола ----------
  // На телефоне — только номер брони, её секрет и последний известный статус; правду знает сервер.
  let booking = (() => { const b = store.get('booking', null); return b && b.id && b.token ? b : null; })();
  const bkForm = { day: null, time: null, people: 2, name: profile.name, phone: profile.phone, note: '', busy: false, error: '', key: null, sig: '', ask: false };
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
  // 14 дней вперёд; время — каждые 30 минут, когда ресторан открыт. Сегодняшнее время ближе 30 минут — серое.
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
        else if (k === 0 && at > Date.now() - 2 * 3600000) slots.push({ m, iso: new Date(at).toISOString(), off: true });
      }
      out.push({ key: `${u.getUTCFullYear()}-${pad2(u.getUTCMonth() + 1)}-${pad2(u.getUTCDate())}`, k, u, wd, slots, free: slots.some((x) => !x.off) });
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
  // утро / обед / ужин / ночь — по часу слота
  const bkPart = (m) => (m >= 5 * 60 && m < 12 * 60 ? 'morning' : m >= 12 * 60 && m < 17 * 60 ? 'day' : m >= 17 * 60 && m < 22 * 60 ? 'evening' : 'night');

  function bookingHtml() {
    const head = subHead(t('bkTitle'));
    if (booking) return `${head}<div class="pad">${bookingCardHtml()}</div>`;
    if (!R().bookingsEnabled) return `${head}<div class="pad"><p class="notice">${icon('alert')}<span>${esc(t('bkErr').bookings_off)}</span></p></div>`;
    const f = bkForm;
    const days = bkDays();
    if (!days.some((d) => d.key === f.day && d.free)) f.day = days.find((d) => d.free)?.key || null;
    const day = days.find((d) => d.key === f.day);
    if (f.time && !day?.slots.some((x) => x.iso === f.time && !x.off)) f.time = null;
    const fmt = (o) => { try { return new Intl.DateTimeFormat(t('locale'), { ...o, timeZone: 'UTC' }); } catch { return new Intl.DateTimeFormat('en', { ...o, timeZone: 'UTC' }); } };
    const wdF = fmt({ weekday: 'short' });
    const dF = fmt({ day: 'numeric' });
    const mF = fmt({ month: 'short' });
    const dayPills = days.map((d) => `<button type="button" class="day${d.key === f.day ? ' on' : ''}" data-act="bk-day" data-day="${d.key}" aria-pressed="${d.key === f.day}"${d.free ? '' : ' disabled'} aria-label="${esc(`${wdF.format(d.u)} ${dF.format(d.u)} ${mF.format(d.u)}${d.free ? '' : `, ${t('bkDayOff')}`}`)}">
        <small>${esc(d.k === 0 ? t('today') : wdF.format(d.u))}</small><b>${esc(dF.format(d.u))}</b><small class="mon">${esc(d.free ? mF.format(d.u) : t('bkDayOff'))}</small></button>`).join('');
    // время группами: утро, обед, ужин, ночь (по порядку дня)
    const groups = [];
    for (const x of day?.slots || []) {
      const p = bkPart(x.m);
      if (!groups.length || groups[groups.length - 1].p !== p) groups.push({ p, list: [] });
      groups[groups.length - 1].list.push(x);
    }
    const times = day?.free
      ? groups.map((g) => `<p class="grp">${esc(t('bkParts')[g.p])}<i aria-hidden="true"></i></p><div class="times">${g.list.map((x) => `<button type="button" class="time${x.iso === f.time ? ' on' : ''}" data-act="bk-time" data-at="${x.iso}" aria-pressed="${x.iso === f.time}"${x.off ? ' disabled' : ''}><bdi dir="ltr">${esc(clock(`${pad2(Math.floor(x.m / 60))}:${pad2(x.m % 60)}`))}</bdi></button>`).join('')}</div>`).join('')
      : `<p class="hint-note pad">${esc(t('bkNoTimes'))}</p>`;
    const r = R();
    const big = r.phone ? `<small>${esc(t('bkBig'))} · <a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}"><bdi dir="ltr">${esc(r.phone)}</bdi></a></small>` : '';
    return `${head}
      <div class="days" data-keep-x="bk-days" role="group" aria-label="${esc(t('bkDate'))}">${dayPills}</div>
      <div class="guests"><b>${esc(t('bkPeople'))}${big}</b>
        <div class="step"><button type="button" data-act="bk-people" data-d="-1" aria-label="${esc(`${t('bkPeople')} −1`)}"${f.people <= 1 ? ' disabled' : ''}>${icon('minus')}</button><b aria-live="polite">${f.people}</b><button type="button" data-act="bk-people" data-d="1" aria-label="${esc(`${t('bkPeople')} +1`)}"${f.people >= 20 ? ' disabled' : ''}>${icon('plus')}</button></div></div>
      <div class="bk-times" role="group" aria-label="${esc(t('bkTime'))}">${times}</div>
      <div class="two">
        <label class="field"><small>${esc(t('bkName'))}</small><input id="bk-name" autocomplete="name" maxlength="60" placeholder="${esc(t('dvNamePh'))}" value="${esc(f.name)}"></label>
        <label class="field"><small>${esc(t('bkPhone'))}</small><input id="bk-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" placeholder="${esc(t('bkPhonePh'))}" value="${esc(f.phone)}"></label>
      </div>
      <label class="field"><small>${esc(t('bkNote'))}</small><textarea id="bk-note" rows="2" maxlength="300" placeholder="${esc(t('bkNotePh'))}">${esc(f.note)}</textarea></label>
      <div class="cta-bar">
        ${f.error ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(f.error)}</span></p>` : ''}
        <button type="button" class="cta" data-act="bk-send"${f.busy ? ' disabled' : ''}>${f.busy ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('sending'))}</span>` : `<span>${esc(f.time ? t('bkSendAt')(bkWhen(f.time)) : t('bkSend'))}</span>`}</button>
      </div>`;
  }

  // карточка брони: «Бронь №101 · сб, 22 нояб., 19:30 · 4 гостя» и статус
  function bookingCardHtml(compact) {
    const b = booking;
    const st = b.status || 'new';
    const stText = st === 'confirmed' && b.table_label ? `${t('bkStatus').confirmed}, ${t('bkTable')(b.table_label)}` : (t('bkStatus')[st] || st);
    const kind = st === 'cancelled' || st === 'no_show' ? 'off' : st === 'new' ? 'wait' : 'ok';
    const canCancel = bkActive();
    const f = bkForm;
    const card = `<div class="bk-card is-${kind}" aria-live="polite">
        <span class="bk-icon">${icon(kind === 'ok' ? 'check' : kind === 'off' ? 'x' : 'clock')}</span>
        <div><b>${esc(stText)}</b><span>${esc([t('bkNo')(b.no), bkWhen(b.at), t('bkGuests')(b.people)].join(' · '))}</span></div>
      </div>`;
    if (compact) return `<button type="button" class="bk-open" data-act="go" data-to="booking">${card}</button>`;
    const actions = canCancel
      ? (f.ask
        ? `<p class="bk-ask">${esc(t('bkCancelAsk')(b.no))}</p><div class="btn-pair">
            <button type="button" class="btn ghost" data-act="bk-cancel-no"${f.busy ? ' disabled' : ''}>${esc(t('bkCancelNo'))}</button>
            <button type="button" class="btn soft" data-act="bk-cancel-yes"${f.busy ? ' disabled' : ''}>${f.busy ? '<span class="spinner" aria-hidden="true"></span>' : ''}<span>${esc(t('bkCancelYes'))}</span></button></div>`
        : `<button type="button" class="btn ghost" data-act="bk-cancel">${esc(t('bkCancel'))}</button>`)
      : `<button type="button" class="btn" data-act="bk-new">${esc(t('bkNew'))}</button>`;
    return `${card}
      ${st === 'new' && canCancel ? `<p class="hint-note">${esc(t('bkWait'))}</p>` : ''}
      ${f.error ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(f.error)}</span></p>` : ''}
      <div class="bk-actions">${actions}</div>`;
  }

  function renderBooking() {
    if (route.name !== 'booking' || !M) return;
    setHtml($('#scr-booking'), bookingHtml());
  }
  async function sendBooking() {
    const f = bkForm;
    if (f.busy) return;
    const name = f.name.trim();
    const phone = f.phone.trim().replace(/\s+/g, ' ');
    f.error = !f.time ? t('bkNeedTime') : !name ? t('bkNeedName') : !PHONE_RE.test(phone) ? t('bkNeedPhone') : '';
    if (!f.error && new Date(f.time).getTime() < Date.now() + 30 * 60000) { f.time = null; f.error = t('bkErr').bad_time; }
    if (f.error) { renderBooking(); return; }
    // один ключ на одну попытку: повторное нажатие и потерянный ответ не создадут вторую бронь
    const sig = JSON.stringify([name, phone, f.time, f.people, f.note.trim()]);
    if (!f.key || f.sig !== sig) { f.key = uuid(); f.sig = sig; }
    f.busy = true;
    renderBooking();
    try {
      const rows = await rpc('book_table', { p_name: name, p_phone: phone, p_at: f.time, p_people: f.people, p_note: f.note.trim() || null, p_lang: lang, p_client_key: f.key });
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (!r?.id || !r.guest_token) throw new Error('bad_reply');
      booking = { id: r.id, token: r.guest_token, no: r.no, at: r.at, people: r.people, status: r.status || 'new', table_label: null };
      store.set('booking', booking);
      profile.name = name;
      profile.phone = phone;
      saveProfile();
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
      renderBooking();
    }
  }
  async function cancelBooking() {
    if (!booking || bkForm.busy) return;
    bkForm.busy = true;
    bkForm.error = '';
    renderBooking();
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
      renderBooking();
    }
  }
  // статус спрашиваем, когда открыт экран брони (раз в 20 с) и когда гость вернулся на страницу
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
      if (!bkForm.busy) renderBooking();
    } catch { /* нет связи — показываем последний известный статус */ }
  }
  function scheduleBooking() {
    clearTimeout(bkTimer);
    if (route.name !== 'booking' || !booking) return;
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
        <div class="art tint-${tint(d)}${d.photo ? ' has-img' : ''}"${d.photo ? ` data-zoom="${esc(d.id)}"` : ''}>${d.photo ? img(d) : ''}${favBtn(d.id)}</div>
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
      return;
    }

    if (sheet.type === 'service') {
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('svcBtn'))}</h2>${callsHtml()}`;
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
    if (sheet.type === 'how') {
      // как будете заказывать: за столом (QR) или доставка — блюдо добавится после выбора
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('howTitle'))}</h2>
        ${pendingAdd ? `<p class="sheet-desc">${esc(t('howHint'))}</p>` : ''}${waysHtml(true)}`;
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
  // светлая по умолчанию, даже если телефон в тёмной теме; тёмная — только если гость выбрал её сам
  let theme = store.get('theme', null);
  function applyTheme() {
    const th = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = th;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#1A1511' : '#F7F1E7');
  }

  // ---------- Плашка режима над меню ----------
  function renderModeBanner() {
    const el = $('#mode-banner');
    if (!el) return;
    if (!M || !ONLINE) { setHtml(el, ''); return; }
    const m = mode();
    const x = (act) => `<button type="button" class="mode-x" data-act="${act}" aria-label="${esc(t('modeExit'))}" title="${esc(t('modeExit'))}">${icon('x')}</button>`;
    let html;
    if (m === 'table') {
      html = `<div class="mode is-table">${icon(tableState === 'ok' ? 'check' : 'clock')}<p><b>${esc(t('modeTable')(table || '…'))}</b><small>${esc(t('modeTableSub'))}</small></p>
        <button type="button" class="mode-btn" data-act="scan">${esc(t('modeChange'))}</button>${x('table-exit')}</div>`;
    } else if (m === 'delivery') {
      const q = dv.quote?.ok ? dv.quote : null;
      html = `<div class="mode is-dv">${icon('moto')}<p><b>${esc(q ? t('modeDvKm')(kmText(q.km), money(q.fee)) : t('modeDv'))}</b><small>${esc(q && profile.address.trim() ? profile.address.trim() : t('modeDvSub'))}</small></p>
        <button type="button" class="mode-btn" data-act="go" data-to="delivery">${esc(t('modeEdit'))}</button>${x('dv-exit')}</div>`;
    } else {
      html = `<div class="mode is-browse">${icon('book')}<p><b>${esc(t('modeBrowse'))}</b><small>${esc(t('modeBrowseSub'))}</small></p>
        <button type="button" class="mode-btn" data-act="choose">${esc(t('modeChoose'))}</button></div>`;
    }
    setHtml(el, html);
  }

  // гость нажал «добавить», а способ ещё не выбран: спрашиваем «в ресторане или доставка», блюдо добавим после
  let pendingAdd = null;
  const needWay = () => ONLINE && !!M && mode() === 'browse';
  function askHow(p) {
    pendingAdd = p;
    openSheet({ type: 'how' });
  }
  function applyPending() {
    const p = pendingAdd;
    pendingAdd = null;
    if (!p) return;
    if (p.act === 'inc') { change(p.key, 1); return; }
    const d = byId[p.id];
    if (!d || !orderable(d) || !optInfo(d, p.sel).ok || stockBlocked(d, p.qty)) return;
    const key = makeKey(d.id, p.sel);
    order[key] = Math.min(99, (order[key] || 0) + p.qty);
    remember(key);
    store.set('order', order);
    refreshSlots();
    renderBar();
  }

  // ---------- Заказы ----------
  function renderOrders() {
    if (route.name !== 'orders') return;
    const list = myOrders.filter((o) => tracked[o.id]).sort((a, b) => b.at - a.at);
    const body = list.length
      ? `<ul class="olist">${list.map((o) => {
        const d = tracked[o.id];
        const kind = o.kind || d.kind || 'table';
        const where = kind === 'delivery' ? t('modeDv') : `${t('table')} ${d.table_label || ''}`.trim();
        return `<li><button type="button" class="ocard" data-act="go" data-to="track" data-arg="${esc(o.id)}">
          <span class="oc-ico">${icon(kind === 'delivery' ? 'moto' : 'table')}</span>
          <span class="oc-main"><b>${esc(t('orderNo')(o.no))}</b><small>${esc(`${where} · ${dayTimeOf(d.created_at)}`)}</small></span>
          <span class="oc-end"><span class="pst is-${stKind(d, kind)}">${esc(statusText(d, kind))}</span><b>${money(d.total)}</b></span></button></li>`;
      }).join('')}</ul><p class="hint-note pad">${esc(t('ordersHint'))}</p>`
      : `<div class="state">${icon('bag')}<h2>${esc(t('ordersEmpty'))}</h2><p>${esc(t('ordersHint'))}</p><button type="button" class="btn" data-act="go" data-to="menu">${esc(t('openMenu'))}</button></div>`;
    setHtml($('#scr-orders'), `${pageHead(t('tabOrders'))}${body}`);
  }

  // ---------- Профиль ----------
  let profBuilt = '';
  function renderProfile() {
    if (route.name !== 'profile') return;
    const el = $('#scr-profile');
    if (!M) { profBuilt = ''; setHtml(el, pageHead(t('tabProfile'))); return; }
    // поля ввода рисуем один раз (иначе при обновлении экрана пропадает курсор), остальное — отдельно
    if (profBuilt !== lang || !el.querySelector('#pf-dyn')) {
      profBuilt = lang;
      el._html = null;
      el.innerHTML = `${pageHead(t('tabProfile'))}
        <section class="pgroup" aria-labelledby="pf-h"><h2 class="psec" id="pf-h">${esc(t('myData'))}</h2>
          <label class="field"><small>${esc(t('dvName'))}</small><input id="pf-name" autocomplete="name" maxlength="60" placeholder="${esc(t('dvNamePh'))}" value="${esc(profile.name)}"></label>
          <label class="field"><small>${esc(t('bkPhone'))}</small><input id="pf-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" placeholder="${esc(t('bkPhonePh'))}" value="${esc(profile.phone)}"></label>
          <label class="field"><small>${esc(t('dvAddr'))}</small><input id="pf-addr" autocomplete="street-address" maxlength="300" placeholder="${esc(t('dvAddrPh'))}" value="${esc(profile.address)}"></label>
          <p class="hint-note">${esc(t('profHint'))}</p>
        </section>
        <div id="pf-dyn"></div>`;
    }
    const r = R();
    const chev = icon('chevron', 'sm chev');
    const dark = document.documentElement.dataset.theme === 'dark';
    const bk = !BOOKING ? '' : booking ? bookingCardHtml(true)
      : ONLINE && r.bookingsEnabled ? `<div class="rows"><button type="button" class="row-link" data-act="go" data-to="booking">${icon('calendar')}<span class="grow">${esc(t('bkBtn'))}</span>${chev}</button></div>` : '';
    const wifiRow = atTable() && wifi ? `<div class="rows"><button type="button" class="row-link" data-sheet="wifi">${icon('wifi')}<span class="grow">${esc(t('wifi'))}</span><span class="val" dir="ltr">${esc(wifi.name)}</span>${chev}</button></div>` : '';
    const favList = favs.map((id) => byId[id]).filter(Boolean);
    const favHtml = favList.length
      ? `<ul class="pair-list">${favList.map((d) => `<li data-open="${esc(d.id)}" role="button" tabindex="0">${thumb(d, 'sm')}<span class="grow"><b>${esc(L(d.name))}</b><small>${money(priceOf(d))}</small></span><span class="slot" data-slot="${esc(d.id)}">${control(d.id)}</span></li>`).join('')}</ul>`
      : `<p class="hint-note">${esc(t('favsEmpty'))}</p>`;
    const halal = r.halal ? `<button type="button" class="row-link" data-sheet="${r.halalNote ? 'halal' : 'hours'}">${icon('check')}<span class="grow">${esc(t('halal'))}</span>${r.halalNote ? chev : ''}</button>` : '';
    setHtml($('#pf-dyn'), `
      ${bk ? `<section class="pgroup"><h2 class="psec">${esc(t('bkTitle'))}</h2>${bk}</section>` : ''}
      ${wifiRow ? `<section class="pgroup"><h2 class="psec">${esc(t('wifi'))}</h2>${wifiRow}</section>` : ''}
      <section class="pgroup"><h2 class="psec">${esc(t('favs'))}</h2>${favHtml}</section>
      <section class="pgroup"><div class="rows">
        ${LANGS.length > 1 ? `<button type="button" class="row-link" data-sheet="lang">${icon('globe')}<span class="grow">${esc(t('language'))}</span><span class="val">${esc(t('langName'))}</span>${chev}</button>` : ''}
        <button type="button" class="row-link" data-act="theme" role="switch" aria-checked="${dark}">${icon(dark ? 'moon' : 'sun')}<span class="grow">${esc(t('themeDark'))}</span><span class="switch${dark ? ' on' : ''}" aria-hidden="true"></span></button>
      </div></section>
      <section class="pgroup"><h2 class="psec">${esc(t('about'))}</h2><div class="rows">
        <button type="button" class="row-link" data-sheet="hours">${icon('clock')}<span class="grow">${esc(t('hours'))}</span><span class="val">${esc(statusInfo().text)}</span>${chev}</button>
        ${halal}${infoLinks()}
      </div></section>`);
  }

  // ---------- Доставка ----------
  const dv = { pay: store.get('dvPay', 'cash') === 'card' ? 'card' : 'cash', quote: null, quoting: false, busy: false, error: '' };
  // библиотеки грузим только когда они нужны; версии закреплены, целостность проверяет браузер
  const LEAFLET = {
    js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', jsSri: 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH',
    css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', cssSri: 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H',
  };
  const JSQR = { js: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', sri: 'sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx' };
  function loadScript(src, sri) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.integrity = sri;
      s.crossOrigin = 'anonymous';
      s.onload = () => res();
      s.onerror = () => { s.remove(); rej(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  let leafletP = null;
  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    if (!leafletP) {
      if (!document.querySelector('link[data-leaflet]')) {
        const css = document.createElement('link');
        Object.assign(css, { rel: 'stylesheet', href: LEAFLET.css, integrity: LEAFLET.cssSri, crossOrigin: 'anonymous' });
        css.dataset.leaflet = '1';
        // перед guest.css — наши правила для карты важнее
        document.head.insertBefore(css, document.querySelector('link[href^="guest.css"]'));
      }
      leafletP = loadScript(LEAFLET.js, LEAFLET.jsSri).then(() => window.L).catch((e) => { leafletP = null; throw e; });
    }
    return leafletP;
  }

  let dvBuilt = '';
  function renderDelivery() {
    if (route.name !== 'delivery') return;
    const el = $('#scr-delivery');
    if (!M) { dvBuilt = ''; setHtml(el, subHead(t('modeDv'))); return; }
    const sig = `${lang}|${dvReady()}`;
    if (dvBuilt !== sig || !el.querySelector('#dv-cta') === dvReady()) {
      dvBuilt = sig;
      el._html = null;
      destroyMap();   // контейнер карты новый — карту создаём заново
      if (!dvReady()) {
        el.innerHTML = `${subHead(t('modeDv'))}<div class="state">${icon('moto')}<h2>${esc(`${t('wayDelivery')} · ${t('waySoon')}`)}</h2><p>${esc(t('dvOff'))}</p>
          <button type="button" class="btn" data-act="go" data-to="menu">${esc(t('openMenu'))}</button></div>`;
        return;
      }
      el.innerHTML = `${subHead(t('modeDv'))}
        <div class="map-wrap"><div id="dv-map" class="map" dir="ltr" role="application" aria-label="${esc(t('dvPinHint'))}"></div>
          <span class="chipm" id="dv-chip" aria-live="polite"></span>
          <button type="button" class="round map-me" data-act="dv-me" aria-label="${esc(t('dvMe'))}" title="${esc(t('dvMe'))}">${icon('locate')}</button></div>
        <label class="field"><small>${esc(t('dvAddr'))}</small><input id="dv-addr" autocomplete="street-address" maxlength="300" placeholder="${esc(t('dvAddrPh'))}" value="${esc(profile.address)}"></label>
        <div class="two">
          <label class="field"><small>${esc(t('dvName'))}</small><input id="dv-name" autocomplete="name" maxlength="60" placeholder="${esc(t('dvNamePh'))}" value="${esc(profile.name)}"></label>
          <label class="field"><small>${esc(t('bkPhone'))}</small><input id="dv-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" placeholder="${esc(t('bkPhonePh'))}" value="${esc(profile.phone)}"></label>
        </div>
        <label class="field"><small>${esc(t('dvNote'))}</small><textarea id="dv-note" rows="2" maxlength="300" placeholder="${esc(t('dvNotePh'))}">${esc(note)}</textarea></label>
        <div id="dv-sum"></div>
        <div class="pay" id="dv-pay" role="radiogroup" aria-label="${esc(t('payHow'))}"></div>
        <p class="hint-note pad">${esc(t('dvSaveHint'))}</p>
        <p class="hint-note pad dv-call-note">${icon('phone', 'sm')}<span>${esc(t(R().dvSms ? 'dvMayCall' : 'dvWillCall'))}</span></p>
        <div id="dv-sms"></div>
        <div class="cta-bar" id="dv-cta"></div>`;
    }
    updateDelivery();
    renderSms();
    // цена считается и без карты (карта могла не загрузиться — точку даст «Моё местоположение»)
    if (profile.lat != null && !dv.quoting && (!dv.quote || dv.quote.reason === 'net')) quote();
    initMap();
  }
  // меняем только сумму, кнопку и подсказки — поля ввода не трогаем
  function updateDelivery() {
    if (route.name !== 'delivery' || !$('#dv-cta')) return;
    const q = dv.quote;
    $('#dv-chip').innerHTML = dv.quoting ? `<span class="spinner sm" aria-hidden="true"></span>`
      : q?.km != null ? `${icon('pin', 'sm')}<b>${esc(t('dvKm')(kmText(q.km)))}</b><em>${esc(t('dvFrom'))}</em>`
        : `${icon('pin', 'sm')}<em>${esc(t('dvPinHint'))}</em>`;
    $('#dv-pay').innerHTML = [['cash', 'cash', 'dvPayCash'], ['card', 'card', 'dvPayCard']].map(([v, ic, k]) => `<button type="button" class="pay-chip${dv.pay === v ? ' on' : ''}" data-act="dv-pay" data-pay="${v}" role="radio" aria-checked="${dv.pay === v}">${icon(ic, 'sm')}<span>${esc(t(k))}</span></button>`).join('');
    const { count } = totals();
    const c = dvTotals();
    const r = R();
    $('#dv-sum').innerHTML = count ? `<div class="sum">
        <div><span>${esc(t('dvDishes')(count))}</span><b>${money(c.sub)}</b></div>
        ${c.tax ? `<div><span>${esc(`${r.taxName || 'SST'} ${pct(r.taxPct)}%`)}</span><b>${money(c.tax)}</b></div>` : ''}
        <div><span>${esc(c.q ? t('dvFeeUpTo')(kmText(c.q.zone_km)) : t('dvFee'))}</span><b>${c.q ? money(c.fee) : '—'}</b></div>
        <div class="tot"><span>${esc(t('total'))}</span><b>${money(c.total)}</b></div></div>` : '';
    const block = count ? dvBlocker() : '';
    const msg = dv.error || block;
    // пока гость вводит код из SMS — кнопка заказа спрятана: заказ уйдёт сам после верного кода
    if (dv.sms && count) { $('#dv-cta').innerHTML = msg ? `<p class="notice${dv.error ? ' bad' : ''}" role="${dv.error ? 'alert' : 'status'}">${icon('alert')}<span>${esc(msg)}</span></p>` : ''; return; }
    $('#dv-cta').innerHTML = `${msg ? `<p class="notice${dv.error ? ' bad' : ''}" role="${dv.error ? 'alert' : 'status'}">${icon('alert')}<span>${esc(msg)}</span></p>` : ''}
      ${count ? `<button type="button" class="cta" data-act="dv-send"${block || dv.busy || dv.quoting || !c.q ? ' disabled' : ''}>${dv.busy ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('sending'))}</span>` : `<span>${esc(t('dvSend')(money(c.total)))}</span>`}</button>`
    : `<p class="notice info">${icon('bag')}<span>${esc(`${t('cartEmpty')}. ${t('cartEmptyHint')}`)}</span></p><button type="button" class="cta" data-act="go" data-to="menu"><span>${esc(t('openMenu'))}</span></button>`}`;
  }

  let map = null;
  let pin = null;
  function destroyMap() { if (map) { map.remove(); map = null; pin = null; } }
  async function initMap() {
    const box = $('#dv-map');
    if (!box || !dvReady()) return;
    let L;
    try { L = await loadLeaflet(); } catch {
      if ($('#dv-map') === box && !map) box.innerHTML = `<div class="map-fail">${icon('alert')}<span>${esc(t('dvMapErr'))}</span><button type="button" class="btn small ghost" data-act="dv-map-retry">${esc(t('retry'))}</button></div>`;
      return;
    }
    if (route.name !== 'delivery' || $('#dv-map') !== box) return;
    const r = R();
    const home = [r.deliveryLat, r.deliveryLng];
    if (map && map.getContainer() !== box) destroyMap();
    if (!map) {
      box.innerHTML = '';
      const has = profile.lat != null;
      map = L.map(box, { zoomControl: false }).setView(has ? [profile.lat, profile.lng] : home, has ? 15 : 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));
      // ресторан — звезда; пунктирный круг — дальняя зона доставки (из настроек ресторана)
      L.marker(home, { icon: L.divIcon({ className: 'mk-home', html: '<svg class="ic" aria-hidden="true"><use href="#i-star8"/></svg>', iconSize: [34, 34], iconAnchor: [17, 17] }), keyboard: false, interactive: false }).addTo(map);
      const far = Math.max(...r.deliveryZones.map((z) => z.km));
      L.circle(home, { radius: far * 1000, color: '#B4472F', weight: 1.2, opacity: 0.5, dashArray: '4 6', fillColor: '#B4472F', fillOpacity: 0.04, interactive: false }).addTo(map);
    }
    placePin();
    requestAnimationFrame(() => map?.invalidateSize());
  }
  function placePin() {
    if (!map || profile.lat == null || !window.L) return;
    const ll = [profile.lat, profile.lng];
    if (pin) { pin.setLatLng(ll); return; }
    const icn = window.L.divIcon({ className: 'mk-pin', html: '<svg viewBox="0 0 28 40" aria-hidden="true"><path d="M14 38s-11-9.6-11-18.6a11 11 0 0 1 22 0C25 28.4 14 38 14 38z"/><circle cx="14" cy="19" r="4"/></svg>', iconSize: [28, 40], iconAnchor: [14, 38] });
    pin = window.L.marker(ll, { icon: icn, draggable: true, keyboard: false }).addTo(map);
    pin.on('dragend', () => { const p = pin.getLatLng(); setPoint(p.lat, p.lng); });
  }
  function setPoint(lat, lng) {
    profile.lat = Math.round(lat * 1e6) / 1e6;
    profile.lng = Math.round(lng * 1e6) / 1e6;
    saveProfile();
    dv.error = '';
    placePin();
    quote();
  }
  function locateMe() {
    if (!navigator.geolocation) { toast(t('dvGeoErr'), 'bad'); return; }
    navigator.geolocation.getCurrentPosition((p) => {
      setPoint(p.coords.latitude, p.coords.longitude);
      map?.setView([profile.lat, profile.lng], 16);
    }, () => toast(t('dvGeoErr'), 'bad'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  // сколько стоит доставка в эту точку — считает сервер (по зонам ресторана)
  let quoteSeq = 0;
  async function quote() {
    if (profile.lat == null || !dvReady()) { dv.quote = null; updateDelivery(); return; }
    const seq = ++quoteSeq;
    dv.quoting = true;
    updateDelivery();
    let q;
    try {
      const res = await rpc('delivery_quote', { p_lat: profile.lat, p_lng: profile.lng });
      q = Array.isArray(res) ? res[0] : res;
      if (!q || typeof q !== 'object') q = { ok: false, reason: 'bad_point' };
    } catch { q = { ok: false, reason: 'net' }; }
    if (seq !== quoteSeq) return;
    dv.quote = q;
    dv.quoting = false;
    if (q.reason === 'off') refreshMenu(true);
    updateDelivery();
    renderModeBanner();
    renderBar();
  }
  // ---------- Проверка номера по SMS ----------
  // ключ номера живёт год: { "+60123456789": "uuid" } — во второй раз код не нужен
  const phoneTokens = () => { const v = store.get('phoneTokens', {}); return v && typeof v === 'object' ? v : {}; };
  function savePhoneToken(ph, tok) { store.set('phoneTokens', { ...phoneTokens(), [ph]: tok }); }
  function forgetPhoneToken(ph) { const v = phoneTokens(); delete v[ph]; store.set('phoneTokens', v); }
  let smsTimer = null;
  // dv.sms: { phone, sentAt, wait, busy, error } — шаг «введите код»
  function openSms(ph) {
    dv.sms = { phone: ph, sentAt: 0, wait: 0, busy: false, error: '' };
    dv.error = '';
    updateDelivery();
    renderSms();
    $('#dv-sms .sms-step')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    requestCode();
  }
  function closeSms() {
    dv.sms = null;
    clearInterval(smsTimer);
    renderSms();
    updateDelivery();
  }
  const smsLeft = () => (dv.sms?.sentAt ? Math.max(0, Math.ceil((dv.sms.sentAt + dv.sms.wait * 1000 - Date.now()) / 1000)) : 0);
  const mmss = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  function paintSmsResend() {
    const b = $('#sms-resend');
    if (!b || !dv.sms) return;
    const left = smsLeft();
    b.disabled = left > 0 || dv.sms.busy;
    b.textContent = left > 0 ? t('smsResendIn')(mmss(left)) : t('smsResend');
  }
  function paintSmsErr() {
    const e = $('#sms-err');
    if (!e || !dv.sms) return;
    e.hidden = !dv.sms.error;
    e.innerHTML = dv.sms.error ? `${icon('alert')}<span>${esc(dv.sms.error)}</span>` : '';
    const v = $('#sms-verify');
    if (v) {
      v.disabled = dv.sms.busy || !dv.sms.sentAt;
      v.innerHTML = dv.sms.busy && dv.sms.sentAt ? `<span class="spinner" aria-hidden="true"></span><span>${esc(t('smsVerify'))}</span>` : `<span>${esc(t('smsVerify'))}</span>`;
    }
    const sub = $('#sms-sub');
    if (sub) sub.textContent = dv.sms.sentAt ? t('smsSent')(ltr(dv.sms.phone)) : dv.sms.busy ? t('smsSending') : t('smsWhy');
    paintSmsResend();
  }
  // блок рисуется целиком только при открытии шага; дальше меняем текст ошибки, подпись и таймер
  function renderSms() {
    const box = $('#dv-sms');
    if (!box) return;
    if (!dv.sms) { box.innerHTML = ''; clearInterval(smsTimer); return; }
    if (!box.querySelector('#sms-code') || box.dataset.phone !== dv.sms.phone || box.dataset.lang !== lang) {
      const kept = $('#sms-code')?.value || '';
      box.dataset.phone = dv.sms.phone;
      box.dataset.lang = lang;
      box.innerHTML = `<section class="sms-step" aria-labelledby="sms-title">
        <h3 id="sms-title">${icon('phone', 'sm')}<span>${esc(t('smsTitle'))}</span></h3>
        <p class="sms-sub" id="sms-sub" aria-live="polite"></p>
        <label class="field sms-field"><small>${esc(t('smsCode'))}</small><input id="sms-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" dir="ltr" placeholder="••••••" value="${esc(kept)}"></label>
        <p class="notice bad" id="sms-err" role="alert" hidden></p>
        <button type="button" class="cta" id="sms-verify" data-act="sms-verify"><span>${esc(t('smsVerify'))}</span></button>
        <div class="sms-links"><button type="button" class="btn small ghost" id="sms-resend" data-act="sms-resend"></button>
          <button type="button" class="btn small ghost" data-act="sms-change">${esc(t('smsChange'))}</button></div>
      </section>`;
    }
    paintSmsErr();
    clearInterval(smsTimer);
    smsTimer = setInterval(() => { if (!dv.sms || !$('#sms-resend')) { clearInterval(smsTimer); return; } paintSmsResend(); }, 1000);
  }
  function smsErrText(m) {
    const bad = m.match(/bad_code:(\d+)/);
    if (bad) return t('smsBad')(Number(bad[1]));
    if (/too_many_attempts/.test(m)) return t('smsTooMany');
    if (/expired/.test(m)) return t('smsExpired');
    if (/too_many/.test(m)) return t('smsLimit');
    if (/bad_phone/.test(m)) return t('smsBadPhone');
    if (/sms_failed/.test(m)) return t('smsFailed');
    if (/sms_off/.test(m)) return t('smsOff');
    return t('errServer');
  }
  async function requestCode() {
    const s = dv.sms;
    if (!s || s.busy) return;
    s.busy = true;
    s.error = '';
    paintSmsErr();
    try {
      const r = await rpc('request_phone_code', { p_phone: s.phone, p_lang: lang });
      if (dv.sms !== s) return;
      s.sentAt = Date.now();
      s.wait = Number(r?.wait_s) || 60;
    } catch (e) {
      if (dv.sms !== s) return;
      const m = String(e?.message || '');
      const soon = m.match(/too_soon:(\d+)/);
      if (soon) {
        // код уже отправлен меньше минуты назад — он действует, просто ждём
        s.wait = Number(soon[1]);
        s.sentAt = Date.now();
      } else if (/sms_off/.test(m)) {
        // ресторан выключил проверку — заказываем без кода
        await refreshMenu(true);
        if (!R().dvSms) { closeSms(); sendDelivery(); return; }
        s.error = smsErrText(m);
      } else s.error = e?.net ? t('errNetwork') : smsErrText(m);
    } finally {
      if (dv.sms === s) { s.busy = false; paintSmsErr(); if (s.sentAt) $('#sms-code')?.focus(); }
    }
  }
  async function verifyCode() {
    const s = dv.sms;
    const inp = $('#sms-code');
    if (!s || s.busy || !inp) return;
    const code = inp.value.replace(/\D/g, '');
    if (code.length !== 6) { s.error = t('smsBad')(5).split(/[,，،]/)[0]; paintSmsErr(); inp.focus(); return; }
    s.busy = true;
    s.error = '';
    paintSmsErr();
    try {
      const r = await rpc('verify_phone_code', { p_phone: s.phone, p_code: code });
      if (dv.sms !== s) return;
      if (!r?.phone_token) throw new Error('bad_reply');
      savePhoneToken(r.phone || s.phone, r.phone_token);
      closeSms();
      toast(t('smsOk'));
      sendDelivery();   // номер подтверждён — отправляем заказ сразу
      return;
    } catch (e) {
      if (dv.sms !== s) return;
      const m = String(e?.message || '');
      s.error = e?.net ? t('errNetwork') : smsErrText(m);
      // сгоревший или устаревший код — сразу можно просить новый
      if (/too_many_attempts|expired/.test(m)) { s.sentAt = 0; s.wait = 0; inp.value = ''; }
      else inp.select();
    } finally {
      if (dv.sms === s) { s.busy = false; paintSmsErr(); }
    }
  }

  async function sendDelivery() {
    if (dv.busy || !lines().length) return;
    const name = profile.name.trim();
    const phone = profile.phone.trim().replace(/\s+/g, ' ');
    const addr = profile.address.trim().replace(/\s+/g, ' ');
    const bad = addr.length < 5 ? 'dv-addr' : !name ? 'dv-name' : phone.length > 20 || !PHONE_RE.test(phone) ? 'dv-phone' : '';
    dv.error = dvBlocker() || (bad === 'dv-addr' ? t('dvNeedAddr') : bad === 'dv-name' ? t('bkNeedName') : bad === 'dv-phone' ? t('bkNeedPhone') : '');
    if (dv.error) { updateDelivery(); if (bad && !dvBlocker()) $(`#${bad}`)?.focus(); return; }
    // проверка номера по SMS (если ресторан включил): без ключа номера — сначала код
    const ph = e164(phone);
    let phoneToken = null;
    if (R().dvSms) {
      // код приходит только на малайзийские номера (+60) — как request_phone_code в базе
      if (!ph || !ph.startsWith('+60')) { dv.error = t('smsBadPhone'); updateDelivery(); $('#dv-phone')?.focus(); return; }
      phoneToken = phoneTokens()[ph] || null;
      if (!phoneToken) { openSms(ph); return; }
    }
    dv.busy = true;
    updateDelivery();
    try {
      if (!(await freshCheck())) { dv.error = t('errChanged'); return; }
      await quote();
      if (dvBlocker()) { dv.error = dvBlocker(); return; }
      // один ключ на одну попытку: повторное нажатие и потерянный ответ не создадут вторую доставку
      const sig = JSON.stringify(['dv', name, phone, addr, profile.lat, profile.lng, dv.pay, note.trim(), lines().map((l) => [l.key, l.n, l.unit, dishNotes[l.key] || '']).sort()]);
      if (!pendingKey || pendingKey.sig !== sig) {
        pendingKey = { key: uuid(), sig };
        store.set('pendingKey', pendingKey);
      }
      const rows = await rpc('place_delivery', {
        p_items: itemsPayload(), p_name: name, p_phone: phone, p_address: addr, p_note: note.trim() || null,
        p_lat: profile.lat, p_lng: profile.lng, p_pay: dv.pay, p_lang: lang, p_client_key: pendingKey.key,
        ...(phoneToken ? { p_phone_token: phoneToken } : {}),
      });
      const o = Array.isArray(rows) ? rows[0] : rows;
      if (!o?.id || !o.guest_token) throw new Error('bad_reply');
      profile.name = name;
      profile.phone = phone;
      profile.address = addr;
      saveProfile();
      dv.busy = false;
      dv.error = '';
      placed({ ...o, kind: 'delivery', address: addr, pay_method: dv.pay, table_label: o.table_label || '' }, 'delivery', ph ? { phone: ph } : {});
      if (o.status === 'confirm') toast(t('dvWillCall'));
    } catch (e) {
      // ключ номера больше не подходит (стёрт, истёк, номер другой) — просим код ещё раз
      if (/phone_unverified/.test(String(e?.message || ''))) {
        forgetPhoneToken(ph);
        dv.busy = false;
        if (ph) { await refreshMenu(true); if (R().dvSms) { openSms(ph); return; } }
        dv.error = t('smsBadPhone');
        return;
      }
      dv.error = await orderErr(e, 'delivery');
    } finally {
      dv.busy = false;
      renderBar();
      updateDelivery();
    }
  }

  // ---------- Сканер QR-кода стола ----------
  let scanState = 'idle';   // idle | starting | live | checking | nocam | denied | bad | invalid | net
  let scanner = null;       // { stream, timer, detector, badAt }
  let scanFrom = '';        // с какого экрана открыли сканер
  // из текста QR достаём код стола: ссылка на сайт с ?t=… (адрес сравниваем мягко — важен код) или сам код
  function tokenFrom(text) {
    const s = String(text || '').trim();
    if (TOKEN_RE.test(s.toLowerCase())) return s.toLowerCase();
    let u = null;
    try { u = new URL(s); } catch { return ''; }
    if (!/^(https?|capacitor|ionic):$/.test(u.protocol)) return '';
    const v = (u.searchParams.get('t') || new URLSearchParams(u.hash.split('?')[1] || '').get('t') || '').trim().toLowerCase();
    return TOKEN_RE.test(v) ? v : '';
  }
  function renderScan() {
    if (route.name !== 'scan') return;
    const el = $('#scr-scan');
    if (!el.querySelector('#scan-video') || el.dataset.lang !== lang) {
      el.dataset.lang = lang;
      el.innerHTML = `${subHead(t('scanTitle'))}
        <div class="scan-box"><video id="scan-video" playsinline muted autoplay></video><span class="scan-frame" aria-hidden="true"></span></div>
        <div id="scan-msg" class="scan-msg" aria-live="polite"></div>
        <p class="scan-alt">${icon('camera', 'sm')}<span>${esc(t('scanAlt'))}</span></p>`;
      if (scanner) { const v = $('#scan-video'); v.srcObject = scanner.stream; v.play().catch(() => {}); }
    }
    updateScan();
  }
  function updateScan() {
    const msg = $('#scan-msg');
    if (!msg) return;
    const s = scanState;
    const text = { nocam: t('scanNoCam'), denied: t('scanDenied'), bad: t('scanBad'), invalid: t('badTable'), net: `${t('loadError')}. ${t('loadErrorHint')}`, checking: t('checkingTable') }[s] || t('scanHint');
    const bad = ['nocam', 'denied', 'bad', 'invalid', 'net'].includes(s);
    msg.innerHTML = `<p class="${bad ? 'is-bad' : ''}">${s === 'checking' || s === 'starting' ? '<span class="spinner sm" aria-hidden="true"></span>' : ''}<span>${esc(text)}</span></p>
      ${!scanner && s !== 'starting' ? `<button type="button" class="btn" data-act="scan-start">${icon('camera', 'sm')}<span>${esc(t('scanStart'))}</span></button>` : ''}`;
    $('.scan-box')?.classList.toggle('live', !!scanner);
  }
  function stopScan() {
    if (!scanner) return;
    clearTimeout(scanner.timer);
    scanner.stream.getTracks().forEach((x) => x.stop());
    const v = $('#scan-video');
    if (v) v.srcObject = null;
    scanner = null;
  }
  async function startScan() {
    stopScan();
    if (!navigator.mediaDevices?.getUserMedia) { scanState = 'nocam'; updateScan(); return; }
    scanState = 'starting';
    updateScan();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (e) {
      scanState = /NotAllowed|Security|Permission/i.test(e?.name || '') ? 'denied' : 'nocam';
      updateScan();
      return;
    }
    if (route.name !== 'scan') { stream.getTracks().forEach((x) => x.stop()); return; }
    const video = $('#scan-video');
    video.srcObject = stream;
    try { await video.play(); } catch { /* iOS запустит после первого кадра */ }
    let detector = null;
    try {
      if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch { detector = null; }
    if (!detector) loadJsQR().catch(() => {});
    scanner = { stream, timer: 0, detector, badAt: 0 };
    scanState = 'live';
    updateScan();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = async () => {
      const sc = scanner;
      if (!sc || sc.stream !== stream) return;
      let text = null;
      try {
        if (video.readyState >= 2 && scanState !== 'checking') {
          if (sc.detector) {
            const codes = await sc.detector.detect(video);
            text = codes[0]?.rawValue || null;
          } else if (window.jsQR) {
            const k = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight || 1));
            canvas.width = Math.round(video.videoWidth * k);
            canvas.height = Math.round(video.videoHeight * k);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const r = (window.jsQR.default || window.jsQR)(data.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
            text = r?.data || null;
          }
        }
      } catch { text = null; }
      if (text && scanner === sc) await onScanText(text);
      if (scanner === sc) sc.timer = setTimeout(tick, 220);
    };
    tick();
  }
  let jsqrP = null;
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (!jsqrP) jsqrP = loadScript(JSQR.js, JSQR.sri).then(() => window.jsQR).catch((e) => { jsqrP = null; throw e; });
    return jsqrP;
  }
  async function onScanText(text) {
    const token = tokenFrom(text);
    if (!token) {
      if (scanState !== 'bad') { scanState = 'bad'; updateScan(); }
      return;
    }
    scanState = 'checking';
    updateScan();
    let info;
    try { info = await tableInfo(token); } catch { scanState = 'net'; updateScan(); return; }
    if (!info) { scanState = 'invalid'; updateScan(); return; }
    setTable(token, info);
    stopScan();
    scanState = 'idle';
    toast(t('scanOk')(info.label), 'good');
    // пришли в сканер из меню — возвращаемся туда же (без лишнего шага «назад»), иначе меню вместо сканера
    if (scanFrom === 'menu' && (Number(history.state?.i) || 0) > 0) history.back(); else go('menu', '', true);
    applyPending();
    renderAll();
  }

  // ---------- Экраны и адреса: #home #menu #orders #profile, #booking #delivery #scan #track/<id> ----------
  const TABS = TAB_LIST.map(([n]) => n);
  const SUBS = BOOKING ? ['booking', 'delivery', 'scan', 'track'] : ['delivery', 'scan', 'track'];
  const PARENT = { track: 'orders', delivery: 'menu', scan: 'home', booking: 'home' };
  let route = { name: '', arg: '' };
  const scrolls = {};
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const i = h.indexOf('/');
    const name = i < 0 ? h : h.slice(0, i);
    let arg = i < 0 ? '' : h.slice(i + 1);
    try { arg = decodeURIComponent(arg); } catch { arg = ''; }
    return TABS.includes(name) || SUBS.includes(name) ? { name, arg } : null;
  }
  const defaultRoute = () => (atTable() ? 'menu' : 'home');
  function go(name, arg = '', replace = false) {
    const h = `#${name}${arg ? `/${encodeURIComponent(arg)}` : ''}`;
    const depth = Number(history.state?.i) || 0;
    if (replace) history.replaceState({ i: depth }, '', h);
    else if (location.hash !== h) history.pushState({ i: depth + 1 }, '', h);
    showRoute();
  }
  // «назад»: по истории, если пришли сюда внутри приложения; иначе — на родительский экран
  function back() {
    if ((Number(history.state?.i) || 0) > 0) history.back();
    else go(PARENT[route.name] || 'home', '', true);
  }
  function showRoute() {
    const next = parseHash() || { name: defaultRoute(), arg: '' };
    const prev = route;
    const same = prev.name === next.name && prev.arg === next.arg;
    if (!same) {
      if (prev.name) scrolls[prev.name] = window.scrollY;
      if (prev.name === 'scan') { stopScan(); scanState = 'idle'; }
      if (prev.name === 'booking') clearTimeout(bkTimer);
      if (prev.name === 'track') justSent = null;
      if (sheet) closeSheet();
    }
    route = next;
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== next.name; });
    document.body.dataset.route = next.name;
    document.body.classList.toggle('is-sub', SUBS.includes(next.name));
    if (!same) {
      if (next.name === 'booking') { if (!bkForm.name) bkForm.name = profile.name; if (!bkForm.phone) bkForm.phone = profile.phone; bkForm.error = ''; bkForm.ask = false; }
      if (next.name === 'delivery') dv.error = '';
    }
    renderTabs();
    renderRoute();
    renderBar();
    renderTableActions();
    if (!same) {
      window.scrollTo(0, TABS.includes(next.name) ? scrolls[next.name] || 0 : 0);
      const el = document.querySelector(`.screen[data-screen="${next.name}"]`);
      if (el && prev.name && !reduced()) {
        el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
        el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
      }
      if (next.name === 'track') pollOrders();
      if (next.name === 'booking') { pollBooking(); scheduleBooking(); }
      if (next.name === 'scan') { scanFrom = prev.name; if (ONLINE) startScan(); }
      if (next.name === 'menu') onScroll();
    }
  }
  function renderRoute() {
    const n = route.name;
    if (n === 'orders') renderOrders();
    else if (n === 'profile') renderProfile();
    else if (n === 'track') renderTrack();
    else if (n === 'booking') renderBooking();
    else if (n === 'delivery') renderDelivery();
    else if (n === 'scan') renderScan();
  }
  window.addEventListener('popstate', showRoute);
  window.addEventListener('hashchange', showRoute);

  // ---------- События ----------
  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      const k = act.dataset.key || act.dataset.id;
      if (a === 'inc') {
        // блюдо из меню, а способ ещё не выбран — сначала «в ресторане или доставка»
        if (!act.dataset.key && needWay()) askHow({ act: 'inc', key: k });
        else change(k, 1);
      } else if (a === 'dec') change(k, -1);
      else if (a === 'go') {
        const to = act.dataset.to;
        if (to === route.name && TABS.includes(to) && !act.dataset.arg) window.scrollTo({ top: 0, behavior: smooth() });
        else go(to, act.dataset.arg || '');
      } else if (a === 'back') back();
      else if (a === 'fav') toggleFav(act.dataset.id, act);
      else if (a === 'swipe-del') removeLine(k, act.closest('.cart-line'));
      else if (a === 'vote') vote(act);
      else if (a === 'way-here') {
        if (sheet) closeSheet();
        if (atTable()) { if (route.name !== 'menu') go('menu'); applyPending(); } else go('scan');
      } else if (a === 'way-dv') {
        if (!dvReady()) return;
        if (atTable()) forgetTable();   // доставка домой — значит, уже не за столом
        dvMode = true;
        store.set('mode', 'delivery');
        const stay = sheet?.type === 'how';
        if (sheet) closeSheet();
        applyPending();
        renderAll();
        if (!stay) go('delivery');
        if (profile.lat != null && !dv.quote) quote();
      } else if (a === 'choose') askHow(null);
      else if (a === 'scan') go('scan');
      else if (a === 'scan-start') startScan();
      else if (a === 'table-exit') { forgetTable(); renderAll(); }
      else if (a === 'dv-exit') { dvMode = false; store.set('mode', null); renderAll(); }
      else if (a === 'to-delivery') { closeSheet(); go('delivery'); }
      else if (a === 'dv-pay') { dv.pay = act.dataset.pay === 'card' ? 'card' : 'cash'; store.set('dvPay', dv.pay); updateDelivery(); }
      else if (a === 'dv-me') locateMe();
      else if (a === 'dv-map-retry') initMap();
      else if (a === 'dv-send') sendDelivery();
      else if (a === 'sms-verify') verifyCode();
      else if (a === 'sms-resend') requestCode();
      else if (a === 'sms-change') { closeSms(); $('#dv-phone')?.focus(); }
      else if (a === 'close-sheet') closeSheet();
      else if (a === 'theme') { theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('theme', theme); applyTheme(); renderProfile(); }
      else if (a === 'search-open') {
        const row = $('#search-row');
        row.hidden = !row.hidden || !!query;
        if (!row.hidden) $('#search').focus();
      } else if (a === 'bk-day') { bkForm.day = act.dataset.day; bkForm.time = null; bkForm.error = ''; renderBooking(); }
      else if (a === 'bk-time') { bkForm.time = act.dataset.at; bkForm.error = ''; renderBooking(); }
      else if (a === 'bk-people') { bkForm.people = Math.min(20, Math.max(1, bkForm.people + Number(act.dataset.d))); renderBooking(); }
      else if (a === 'bk-send') sendBooking();
      else if (a === 'bk-cancel') { bkForm.ask = true; bkForm.error = ''; renderBooking(); }
      else if (a === 'bk-cancel-no') { bkForm.ask = false; renderBooking(); }
      else if (a === 'bk-cancel-yes') cancelBooking();
      else if (a === 'bk-new') { booking = null; store.set('booking', null); bkForm.error = ''; renderHeader(); renderBooking(); }
      else if (a === 'del') change(k, -(order[k] || 0));
      else if (a === 'pick') openSheet({ type: 'dish', id: act.dataset.id });
      else if (a === 'pick-inc' || a === 'pick-dec') { if (sheet?.pick) { sheet.pick.qty = Math.min(99, Math.max(1, sheet.pick.qty + (a === 'pick-inc' ? 1 : -1))); updatePick(); } }
      else if (a === 'pick-add') {
        if (needWay() && sheet?.pick) { const p = { act: 'pick', id: sheet.id, sel: pickedOpts(), qty: sheet.pick.qty }; closeSheet(); askHow(p); } else addPicked();
      } else if (a === 'service') openSheet({ type: 'service' });
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
      else if (a === 'rate') { reviewDraft.rating = Number(act.dataset.n); starsLit = true; renderTrack(); }
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
        updateDelivery();
      } else if (a === 'send') {
        sendOrder();
      } else if (a === 'receipt') {
        openReceipt(act.dataset.id);
      } else if (a === 'receipt-print') {
        printReceiptPage();
      } else if (a === 'copy') {
        copyText(act.dataset.v || '', act);
      } else if (a === 'retry') {
        state = 'loading';
        renderMenu();
        renderHome();
        refreshMenu();
      } else if (a === 'show-all') {
        $('#search').value = '';
        query = '';
        filters = {};
        saveFilters();
        renderFilterBtn();
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

  // фото не загрузилось — остаётся узор-заглушка
  document.addEventListener('error', (e) => {
    const im = e.target;
    if (im.tagName !== 'IMG') return;
    const box = im.closest('.thumb, .art, .tile-art, .feature-art, .mark-logo');
    if (!box) return;
    im.remove();
    if (box.classList.contains('mark-logo')) { box.outerHTML = '<svg class="ic star8" aria-hidden="true"><use href="#i-star8"/></svg>'; return; }
    box.classList.remove('has-img');
    box.removeAttribute('data-zoom');
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
    if (o.startsWith('track:')) go('track', o.slice(6)); else openSheet({ type: 'order' });
  });
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'note-input' || id === 'dv-note') {
      note = e.target.value.slice(0, 300);
      store.set('note', note);
    }
    if (id === 'bk-name') bkForm.name = e.target.value.slice(0, 60);
    if (id === 'bk-phone') bkForm.phone = e.target.value.slice(0, 20);
    if (id === 'bk-note') bkForm.note = e.target.value.slice(0, 300);
    if (id === 'pf-name' || id === 'dv-name') { profile.name = e.target.value.slice(0, 60); saveProfile(); }
    if (id === 'pf-phone' || id === 'dv-phone') { profile.phone = e.target.value.slice(0, 20); saveProfile(); if (dv.sms && e164(profile.phone) !== dv.sms.phone) closeSms(); }
    if (id === 'sms-code') {
      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
      if (v !== e.target.value) e.target.value = v;
      if (dv.sms?.error) { dv.sms.error = ''; paintSmsErr(); }
      if (v.length === 6 && dv.sms && !dv.sms.busy && dv.sms.sentAt) verifyCode();
    }
    if (id === 'pf-addr' || id === 'dv-addr') { profile.address = e.target.value.slice(0, 300); saveProfile(); }
    if (id.startsWith('dv-') && dv.error) { dv.error = ''; updateDelivery(); }
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
    renderMenu();
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search').value = '';
    if (!query) { $('#search-row').hidden = true; return; }
    query = '';
    renderMenu();
    $('#search').focus();
  });

  function renderAll() {
    renderFilterBtn();
    renderHeader();
    renderTableActions();
    renderMenu();
    renderBar();
    renderSheet();
    renderRoute();
  }

  // ---------- Запуск ----------
  applyTheme();
  {
    const h = parseHash();
    // пришли по QR-коду стола — сразу меню (с неверным кодом там же будет подсказка)
    const start = fromQrUrl ? 'menu' : h ? null : defaultRoute();
    if (start) history.replaceState({ i: 0 }, '', `#${start}`);
    else if (history.state?.i == null) history.replaceState({ i: 0 }, '', location.hash);
  }
  showRoute();
  renderAll();
  if (tableExpiredNote) setTimeout(() => toast(t('tableExpired')), 600);
  setInterval(() => {   // «Открыто / Закрыто», завтрак по часам и 4 часа стола обновляются сами
    if (!M) return;
    if (expireTable()) return;
    renderHeader();
    if (route.name === 'booking' && !bkForm.busy) renderBooking();
    if (timeSig() !== lastOpenSig) {
      // акция закончилась или началась — цены в корзине тоже другие
      if (reconcile(new Set(lines().filter((l) => !l.ok).map((l) => l.key)))) { attention = sheet?.type !== 'order'; toast(t('listUpdated')); }
      renderMenu(); refreshSlots(); renderBar(); updateDelivery();
      if (sheet?.type === 'order' || sheet?.type === 'dish') renderSheet();
    }
  }, 60 * 1000);
  if (ONLINE) {
    refreshMenu().then(() => { if (mode() === 'delivery' && profile.lat != null) quote(); });
    setTimeout(loadStats, 1200);
    setTimeout(loadPromos, 400);
    checkTable();
    pollOrders().then(() => schedulePoll());
    setInterval(() => { if (!document.hidden) refreshMenu(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (expireTable()) return;
      refreshMenu();
      loadPromos();
      pollBooking();
      pollOrders();
    });
    pollBooking();
    window.addEventListener('online', () => refreshMenu());
  }
})();
