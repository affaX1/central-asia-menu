// =====================================================================
//  МЕНЮ РЕСТОРАНА — всё, что видит гость, меняется только здесь.
//
//  Языки: ru русский, uz узбекский, en английский, ar арабский, ms малайский, zh китайский.
//  У каждого названия и описания есть строчка на каждом языке.
//  Если какого-то языка нет — покажется английский.
//
//  Как добавить блюдо: скопируй любой блок { id: ... } в списке dishes,
//  поменяй id (любое уникальное слово латиницей), название, цену.
//
//  Поля блюда:
//    id          — уникальный код блюда (латиница, без пробелов)
//    category    — id категории из списка categories
//    name, desc  — название и описание на каждом языке
//    price       — цена числом в ринггитах: 28 или 28.90
//    weight/unit — выход: число и 'g' (граммы), 'ml' (миллилитры) или 'pcs' (штуки)
//    kcal        — калории (можно не писать)
//    photo       — ссылка на фото блюда; пока нет — аккуратная заглушка
//    tags        — 'hit' хит, 'new' новинка, 'spicy' острое, 'veg' без мяса
//    meat        — вид мяса: 'beef' говядина, 'lamb' баранина, 'horse' конина, 'chicken' курица, 'fish', 'seafood'
//    ingredients — основные ингредиенты (можно не писать)
//    allergens   — gluten, milk, eggs, fish, shellfish, nuts, soy, sesame
//    hidden      — true, чтобы временно убрать блюдо из меню (стоп-лист)
//
//  ВНИМАНИЕ: цены, вес, калории и описания ниже — ПРИМЕРНЫЕ (черновик), их нужно заменить данными ресторана.
//  Вид мяса и состав НЕ заполнены: их должен указать ресторан.
//  Когда подключена база (config.js), меню берётся из базы, а этот файл — только запасной.
// =====================================================================

window.MENU = {
  // Порядок в списке выбора языка.
  languages: ['ru', 'uz', 'en', 'ar', 'ms', 'zh'],
  // Язык, если языка телефона гостя нет в списке (например, тамильский).
  defaultLanguage: 'en',

  restaurant: {
    name: 'Central Asia Restaurant',
    tagline: { ru: 'Узбекская кухня', uz: "O'zbek oshxonasi", en: 'Uzbek cuisine', ar: 'المطبخ الأوزبكي', ms: 'Masakan Uzbekistan', zh: '乌兹别克菜' },
    logoUrl: null,            // ссылка на картинку логотипа; пока нет — показываем монограмму
    currency: 'RM',           // малайзийский ринггит
    currencyBefore: true,     // писать «RM 28», а не «28 RM»
    timezone: 'Asia/Kuala_Lumpur',
    halal: false,             // «Халяль» показываем, только когда ресторан это подтвердит
    halalNote: null,          // например данные сертификата: { ru: '...', en: '...' }
    // 7 дней с понедельника. close меньше open — работа после полуночи. closed: true — выходной.
    schedule: [
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
      { closed: false, open: '10:00', close: '22:00' },
    ],
    // Адрес и телефон ещё не получены от ресторана — пустые поля на сайте не показываются.
    address: null,            // например { ru: '...', en: '...' }
    mapUrl: null,             // точная ссылка на Google Maps; если нет — ищем по адресу
    phone: '',
    footer: {
      ru: 'Цены и наличие блюд уточняйте у официанта.',
      uz: "Narxlar va taomlar mavjudligini ofitsiantdan so'rang.",
      en: 'Please ask your waiter about prices and availability.',
      ar: 'يرجى سؤال النادل عن الأسعار وتوفر الأطباق.',
      ms: 'Sila tanya pelayan tentang harga dan ketersediaan hidangan.',
      zh: '菜品价格和供应情况请询问服务员。',
    },
  },

  categories: [
    { id: 'plov', name: { ru: 'Плов', uz: 'Palov', en: 'Plov', ar: 'البلوف', ms: 'Plov', zh: '抓饭' } },
    { id: 'soups', name: { ru: 'Супы', uz: "Sho'rvalar", en: 'Soups', ar: 'الشوربات', ms: 'Sup', zh: '汤类' } },
    { id: 'mains', name: { ru: 'Горячее', uz: 'Issiq taomlar', en: 'Mains', ar: 'الأطباق الرئيسية', ms: 'Hidangan Utama', zh: '热菜' } },
    { id: 'grill', name: { ru: 'Шашлык', uz: 'Shashlik', en: 'Grill', ar: 'المشويات', ms: 'Panggang', zh: '烤肉' } },
    { id: 'bakery', name: { ru: 'Самса и лепёшки', uz: 'Somsa va non', en: 'Samsa & bread', ar: 'السمسة والخبز', ms: 'Samsa & Roti', zh: '烤包子和馕' } },
    { id: 'salads', name: { ru: 'Салаты', uz: 'Salatlar', en: 'Salads', ar: 'السلطات', ms: 'Salad', zh: '沙拉' } },
    { id: 'desserts', name: { ru: 'Сладкое', uz: 'Shirinliklar', en: 'Desserts', ar: 'الحلويات', ms: 'Pencuci Mulut', zh: '甜点' } },
    { id: 'drinks', name: { ru: 'Чай и напитки', uz: 'Choy va ichimliklar', en: 'Tea & drinks', ar: 'الشاي والمشروبات', ms: 'Teh & Minuman', zh: '茶和饮品' } },
  ],

  dishes: [
    // ---------- Плов ----------
    {
      id: 'plov-tashkent', category: 'plov', price: 28, weight: 350, unit: 'g', kcal: 720, tags: ['hit'],
      name: { ru: 'Ташкентский плов', uz: 'Toshkent palovi', en: 'Tashkent plov', ar: 'بلوف طشقند', ms: 'Plov Tashkent', zh: '塔什干抓饭' },
      desc: {
        ru: 'Рис девзира, баранина, жёлтая морковь, нут и перепелиное яйцо',
        uz: "Devzira guruch, qo'y go'shti, sariq sabzi, no'xat va bedana tuxumi",
        en: 'Devzira rice, lamb, yellow carrots, chickpeas and a quail egg',
        ar: 'أرز ديفزيرا، لحم ضأن، جزر أصفر، حمص وبيضة سمان',
        ms: 'Beras devzira, daging kambing, lobak kuning, kacang kuda dan telur puyuh',
        zh: '德夫兹拉米、羊肉、黄胡萝卜、鹰嘴豆和鹌鹑蛋',
      },
      allergens: ['eggs'],
    },
    {
      id: 'plov-samarkand', category: 'plov', price: 28, weight: 350, unit: 'g', kcal: 700,
      name: { ru: 'Самаркандский плов', uz: 'Samarqand palovi', en: 'Samarkand plov', ar: 'بلوف سمرقند', ms: 'Plov Samarkand', zh: '撒马尔罕抓饭' },
      desc: {
        ru: 'Готовится слоями: морковь и мясо сверху, рис не перемешивают',
        uz: "Qatlam-qatlam pishiriladi: sabzi va go'sht ustida, guruch aralashtirilmaydi",
        en: 'Cooked in layers, with carrots and meat on top of the rice',
        ar: 'يُطهى على طبقات: الجزر واللحم في الأعلى دون تقليب الأرز',
        ms: 'Dimasak berlapis: lobak dan daging di atas, nasi tidak dikacau',
        zh: '分层烹制，胡萝卜和肉铺在米饭上',
      },
    },
    {
      id: 'plov-wedding', category: 'plov', price: 35, weight: 380, unit: 'g', kcal: 790, tags: ['new'],
      name: { ru: 'Свадебный плов с кази', uz: "Qazili to'y oshi", en: 'Wedding plov with kazy', ar: 'بلوف الأعراس مع القازي', ms: 'Plov Perkahwinan dengan Kazy', zh: '喜宴抓饭配马肉肠' },
      desc: {
        ru: 'Праздничный плов с конской колбасой кази, изюмом и нутом',
        uz: "Qazi, mayiz va no'xat bilan bayram palovi",
        en: 'Festive plov with kazy horse sausage, raisins and chickpeas',
        ar: 'بلوف احتفالي مع نقانق القازي من لحم الخيل والزبيب والحمص',
        ms: 'Plov perayaan dengan sosej daging kuda kazy, kismis dan kacang kuda',
        zh: '节日抓饭，配马肉肠、葡萄干和鹰嘴豆',
      },
    },

    // ---------- Супы ----------
    {
      id: 'lagman-soup', category: 'soups', price: 24, weight: 400, unit: 'g', kcal: 480, tags: ['hit'],
      name: { ru: 'Лагман', uz: "Lag'mon", en: 'Lagman', ar: 'لغمان', ms: 'Lagman', zh: '拉条子' },
      desc: {
        ru: 'Тянутая вручную лапша, говядина, овощи и наваристый бульон',
        uz: "Qo'lda cho'zilgan ugra, mol go'shti, sabzavotlar va quyuq sho'rva",
        en: 'Hand-pulled noodles, beef, vegetables and rich broth',
        ar: 'معكرونة مسحوبة يدويًا، لحم بقري، خضار ومرق غني',
        ms: 'Mi tarik tangan, daging lembu, sayur-sayuran dan kuah pekat',
        zh: '手工拉面、牛肉、蔬菜和浓汤',
      },
      allergens: ['gluten'],
    },
    {
      id: 'shurpa', category: 'soups', price: 24, weight: 400, unit: 'g', kcal: 390,
      name: { ru: 'Шурпа', uz: "Sho'rva", en: 'Shurpa', ar: 'شوربا', ms: 'Shurpa', zh: '舒尔帕羊肉汤' },
      desc: {
        ru: 'Прозрачный бульон из баранины с картофелем, морковью и зеленью',
        uz: "Kartoshka, sabzi va ko'katlar bilan tiniq qo'y go'shti sho'rvasi",
        en: 'Clear lamb broth with potatoes, carrots and herbs',
        ar: 'مرق ضأن صافٍ مع البطاطس والجزر والأعشاب',
        ms: 'Sup kambing jernih dengan kentang, lobak merah dan herba',
        zh: '清炖羊肉汤，配土豆、胡萝卜和香草',
      },
    },
    {
      id: 'mastava', category: 'soups', price: 20, weight: 400, unit: 'g', kcal: 360,
      name: { ru: 'Мастава', uz: 'Mastava', en: 'Mastava', ar: 'ماستافا', ms: 'Mastava', zh: '马斯塔瓦米汤' },
      desc: {
        ru: 'Рисовый суп с мясом и овощами, подаётся с катыком',
        uz: "Go'sht va sabzavotli guruchli sho'rva, qatiq bilan tortiladi",
        en: 'Rice soup with meat and vegetables, served with katyk yoghurt',
        ar: 'شوربة أرز باللحم والخضار تُقدَّم مع لبن القاتيق',
        ms: 'Sup nasi dengan daging dan sayur, dihidang bersama yogurt katyk',
        zh: '肉和蔬菜米汤，配卡特克酸奶',
      },
      allergens: ['milk'],
    },

    // ---------- Горячее ----------
    {
      id: 'manty', category: 'mains', price: 24, weight: 4, unit: 'pcs', kcal: 640, tags: ['hit'],
      name: { ru: 'Манты с бараниной', uz: "Qo'y go'shtli manti", en: 'Manty with lamb', ar: 'مانتي بلحم الضأن', ms: 'Manty Kambing', zh: '羊肉馒提' },
      desc: {
        ru: 'На пару, с рубленой бараниной и луком. Подаются со сметаной',
        uz: "Bug'da pishirilgan, maydalangan qo'y go'shti va piyoz bilan. Smetana bilan tortiladi",
        en: 'Steamed dumplings with chopped lamb and onion, served with sour cream',
        ar: 'فطائر على البخار محشوة بلحم الضأن المفروم والبصل، تُقدَّم مع القشدة الحامضة',
        ms: 'Ladu kukus berinti daging kambing cincang dan bawang, dihidang dengan krim masam',
        zh: '羊肉洋葱蒸包，配酸奶油',
      },
      allergens: ['gluten', 'milk'],
    },
    {
      id: 'manty-pumpkin', category: 'mains', price: 20, weight: 4, unit: 'pcs', kcal: 420, tags: ['veg'],
      name: { ru: 'Манты с тыквой', uz: 'Qovoqli manti', en: 'Manty with pumpkin', ar: 'مانتي باليقطين', ms: 'Manty Labu', zh: '南瓜馒提' },
      desc: {
        ru: 'Сладковатая тыква с луком, на пару',
        uz: "Shirin qovoq va piyoz bilan, bug'da pishirilgan",
        en: 'Steamed dumplings with sweet pumpkin and onion',
        ar: 'فطائر على البخار محشوة باليقطين الحلو والبصل',
        ms: 'Ladu kukus berinti labu manis dan bawang',
        zh: '甜南瓜洋葱蒸包',
      },
      allergens: ['gluten'],
    },
    {
      id: 'chuchvara', category: 'mains', price: 20, weight: 300, unit: 'g', kcal: 560,
      name: { ru: 'Чучвара', uz: 'Chuchvara', en: 'Chuchvara', ar: 'تشوتشفارا', ms: 'Chuchvara', zh: '楚奇瓦拉小饺子' },
      desc: {
        ru: 'Маленькие узбекские пельмени в бульоне или жареные',
        uz: "Kichik o'zbek chuchvarasi, sho'rvada yoki qovurilgan",
        en: 'Small Uzbek dumplings, in broth or fried',
        ar: 'زلابية أوزبكية صغيرة في المرق أو مقلية',
        ms: 'Ladu kecil Uzbekistan, dalam sup atau digoreng',
        zh: '乌兹别克小饺子，可做汤饺或煎饺',
      },
      allergens: ['gluten', 'eggs'],
    },
    {
      id: 'guiru-lagman', category: 'mains', price: 26, weight: 380, unit: 'g', kcal: 620, tags: ['spicy'],
      name: { ru: 'Гуйру лагман', uz: "Qovurma lag'mon", en: 'Guiru lagman', ar: 'لغمان مقلي', ms: 'Lagman Goreng', zh: '过油拉条子' },
      desc: {
        ru: 'Жареная лапша с говядиной, перцем и овощами',
        uz: "Mol go'shti, qalampir va sabzavotlar bilan qovurilgan ugra",
        en: 'Stir-fried noodles with beef, peppers and vegetables',
        ar: 'معكرونة مقلية مع لحم بقري وفلفل وخضار',
        ms: 'Mi goreng dengan daging lembu, lada dan sayur-sayuran',
        zh: '牛肉、甜椒和蔬菜炒拉面',
      },
      allergens: ['gluten'],
    },
    {
      id: 'dimlama', category: 'mains', price: 28, weight: 450, unit: 'g', kcal: 540,
      name: { ru: 'Димляма', uz: 'Dimlama', en: 'Dimlama', ar: 'ديملاما', ms: 'Dimlama', zh: '迪姆拉玛炖菜' },
      desc: {
        ru: 'Мясо, томлённое с картофелем, капустой и овощами',
        uz: "Kartoshka, karam va sabzavotlar bilan dimlangan go'sht",
        en: 'Meat slow-braised with potatoes, cabbage and vegetables',
        ar: 'لحم مطهو ببطء مع البطاطس والملفوف والخضار',
        ms: 'Daging direneh perlahan dengan kentang, kubis dan sayur-sayuran',
        zh: '肉与土豆、卷心菜和蔬菜慢炖',
      },
    },
    {
      id: 'kazan-kebab', category: 'mains', price: 38, weight: 350, unit: 'g', kcal: 780,
      name: { ru: 'Казан-кебаб', uz: 'Qozon kabob', en: 'Kazan kebab', ar: 'كازان كباب', ms: 'Kazan Kebab', zh: '锅烤羊肉' },
      desc: {
        ru: 'Баранина на косточке с картофелем, обжаренные в казане',
        uz: "Qozonda qovurilgan suyakli qo'y go'shti va kartoshka",
        en: 'Lamb on the bone with potatoes, fried in a kazan',
        ar: 'لحم ضأن بالعظم مع البطاطس مقلي في القدر',
        ms: 'Daging kambing bertulang dengan kentang, digoreng dalam kazan',
        zh: '带骨羊肉配土豆，大锅煎烤',
      },
    },

    // ---------- Шашлык ----------
    {
      id: 'shashlik-lamb', category: 'grill', price: 30, weight: 200, unit: 'g', kcal: 520, tags: ['hit'],
      name: { ru: 'Шашлык из баранины', uz: "Qo'y go'shti shashlik", en: 'Lamb shashlik', ar: 'شاشليك لحم ضأن', ms: 'Shashlik Kambing', zh: '羊肉串' },
      desc: {
        ru: 'На углях, с маринованным луком и лепёшкой',
        uz: "Cho'g'da pishirilgan, tuzlangan piyoz va non bilan",
        en: 'Charcoal-grilled, with pickled onion and flatbread',
        ar: 'مشوي على الفحم، مع بصل مخلل وخبز',
        ms: 'Dibakar atas arang, dengan bawang jeruk dan roti leper',
        zh: '炭火烤制，配腌洋葱和馕',
      },
      allergens: ['gluten'],
    },
    {
      id: 'lyulya', category: 'grill', price: 26, weight: 200, unit: 'g', kcal: 480,
      name: { ru: 'Люля-кебаб', uz: 'Lula kabob', en: 'Lyulya kebab', ar: 'لوليا كباب', ms: 'Lyulya Kebab', zh: '柳利亚肉串' },
      desc: {
        ru: 'Рубленая баранина с курдючным жиром и специями',
        uz: "Dumba yog'i va ziravorlar bilan qiyma qo'y go'shti",
        en: 'Minced lamb with tail fat and spices',
        ar: 'لحم ضأن مفروم مع دهن الإلية والبهارات',
        ms: 'Daging kambing kisar dengan lemak ekor dan rempah',
        zh: '羊肉末配羊尾油和香料',
      },
    },
    {
      id: 'shashlik-chicken', category: 'grill', price: 20, weight: 200, unit: 'g', kcal: 360,
      name: { ru: 'Шашлык из курицы', uz: 'Tovuq shashlik', en: 'Chicken shashlik', ar: 'شاشليك دجاج', ms: 'Shashlik Ayam', zh: '鸡肉串' },
      desc: {
        ru: 'Бедро в маринаде, на углях',
        uz: "Marinadlangan tovuq soni, cho'g'da",
        en: 'Marinated chicken thigh, charcoal-grilled',
        ar: 'أفخاذ دجاج متبّلة مشوية على الفحم',
        ms: 'Peha ayam diperap, dibakar atas arang',
        zh: '腌制鸡腿肉，炭火烤制',
      },
    },
    {
      id: 'jigar', category: 'grill', price: 22, weight: 200, unit: 'g', kcal: 330,
      name: { ru: 'Жигар (печень)', uz: 'Jigar kabob', en: 'Jigar (liver)', ar: 'جيغار (كبدة)', ms: 'Jigar (Hati)', zh: '烤羊肝' },
      desc: {
        ru: 'Баранья печень на углях с курдюком',
        uz: "Dumba bilan cho'g'da pishirilgan qo'y jigari",
        en: 'Lamb liver grilled with tail fat',
        ar: 'كبدة ضأن مشوية مع دهن الإلية',
        ms: 'Hati kambing dibakar bersama lemak ekor',
        zh: '羊肝配羊尾油烤制',
      },
    },

    // ---------- Самса и лепёшки ----------
    {
      id: 'samsa-meat', category: 'bakery', price: 9, weight: 1, unit: 'pcs', kcal: 380, tags: ['hit'],
      name: { ru: 'Самса с бараниной', uz: "Qo'y go'shtli somsa", en: 'Lamb samsa', ar: 'سمسة بلحم الضأن', ms: 'Samsa Kambing', zh: '羊肉烤包子' },
      desc: {
        ru: 'Из тандыра, слоёное тесто, сочная начинка',
        uz: "Tandirda, qatlamli xamir, suvli go'sht",
        en: 'Tandoor-baked puff pastry with juicy lamb filling',
        ar: 'مخبوزة في التنور، عجينة مورّقة وحشوة غنية',
        ms: 'Dibakar dalam tandoor, pastri berlapis dengan inti daging kambing',
        zh: '馕坑烤制的酥皮包，多汁羊肉馅',
      },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'samsa-chicken', category: 'bakery', price: 8, weight: 1, unit: 'pcs', kcal: 340,
      name: { ru: 'Самса с курицей', uz: "Tovuq go'shtli somsa", en: 'Chicken samsa', ar: 'سمسة بالدجاج', ms: 'Samsa Ayam', zh: '鸡肉烤包子' },
      desc: {
        ru: 'Из тандыра, с курицей и луком',
        uz: 'Tandirda, tovuq va piyoz bilan',
        en: 'Tandoor-baked, with chicken and onion',
        ar: 'مخبوزة في التنور، بالدجاج والبصل',
        ms: 'Dibakar dalam tandoor, dengan ayam dan bawang',
        zh: '馕坑烤制，鸡肉洋葱馅',
      },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'samsa-pumpkin', category: 'bakery', price: 7, weight: 1, unit: 'pcs', kcal: 260, tags: ['veg'],
      name: { ru: 'Самса с тыквой', uz: 'Qovoqli somsa', en: 'Pumpkin samsa', ar: 'سمسة باليقطين', ms: 'Samsa Labu', zh: '南瓜烤包子' },
      desc: {
        ru: 'Из тандыра, с тыквой и луком',
        uz: 'Tandirda, qovoq va piyoz bilan',
        en: 'Tandoor-baked, with pumpkin and onion',
        ar: 'مخبوزة في التنور، باليقطين والبصل',
        ms: 'Dibakar dalam tandoor, dengan labu dan bawang',
        zh: '馕坑烤制，南瓜洋葱馅',
      },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'non', category: 'bakery', price: 5, weight: 1, unit: 'pcs', tags: ['veg'],
      name: { ru: 'Лепёшка тандырная', uz: 'Tandir non', en: 'Tandoor flatbread', ar: 'خبز التنور', ms: 'Roti Tandoor', zh: '馕' },
      desc: {
        ru: 'Горячая, с кунжутом и чернушкой',
        uz: 'Issiq, kunjut va sedana bilan',
        en: 'Hot, with sesame and nigella seeds',
        ar: 'ساخن، بالسمسم وحبة البركة',
        ms: 'Panas, dengan bijan dan jintan hitam',
        zh: '现烤，撒芝麻和黑种草籽',
      },
      allergens: ['gluten', 'sesame'],
    },

    // ---------- Салаты ----------
    {
      id: 'achichuk', category: 'salads', price: 10, weight: 200, unit: 'g', kcal: 90, tags: ['veg'],
      name: { ru: 'Ачичук', uz: 'Achchiq-chuchuk', en: 'Achichuk', ar: 'أتشيتشوك', ms: 'Achichuk', zh: '阿奇丘克沙拉' },
      desc: {
        ru: 'Томаты, сладкий лук и острый перец — лучшая пара к плову',
        uz: "Pomidor, shirin piyoz va achchiq qalampir — palovga eng yaxshi hamroh",
        en: 'Tomatoes, sweet onion and hot pepper, best with plov',
        ar: 'طماطم وبصل حلو وفلفل حار، أفضل رفيق للبلوف',
        ms: 'Tomato, bawang manis dan cili, paling sesuai dengan plov',
        zh: '番茄、甜洋葱和辣椒，配抓饭最好',
      },
    },
    {
      id: 'tashkent-salad', category: 'salads', price: 18, weight: 220, unit: 'g', kcal: 310,
      name: { ru: 'Салат «Ташкент»', uz: '«Toshkent» salati', en: 'Tashkent salad', ar: 'سلطة طشقند', ms: 'Salad Tashkent', zh: '塔什干沙拉' },
      desc: {
        ru: 'Зелёная редька, отварная говядина, жареный лук и яйцо',
        uz: "Ko'k turp, qaynatilgan mol go'shti, qovurilgan piyoz va tuxum",
        en: 'Green radish, boiled beef, fried onion and egg',
        ar: 'فجل أخضر، لحم بقري مسلوق، بصل مقلي وبيض',
        ms: 'Lobak hijau, daging lembu rebus, bawang goreng dan telur',
        zh: '青萝卜、熟牛肉、炸洋葱和鸡蛋',
      },
      allergens: ['eggs'],
    },
    {
      id: 'fresh-veg', category: 'salads', price: 12, weight: 250, unit: 'g', kcal: 70, tags: ['veg'],
      name: { ru: 'Свежие овощи с зеленью', uz: "Ko'katli yangi sabzavotlar", en: 'Fresh vegetables & herbs', ar: 'خضار طازجة مع الأعشاب', ms: 'Sayur Segar & Herba', zh: '新鲜蔬菜拼盘' },
      desc: {
        ru: 'Огурцы, томаты, перец, редис, зелень',
        uz: "Bodring, pomidor, qalampir, rediska, ko'katlar",
        en: 'Cucumbers, tomatoes, peppers, radish, herbs',
        ar: 'خيار، طماطم، فلفل، فجل، أعشاب',
        ms: 'Timun, tomato, lada, radis dan herba',
        zh: '黄瓜、番茄、甜椒、萝卜、香草',
      },
    },

    // ---------- Сладкое ----------
    {
      id: 'chak-chak', category: 'desserts', price: 14, weight: 150, unit: 'g', kcal: 520, tags: ['veg'],
      name: { ru: 'Чак-чак', uz: 'Chak-chak', en: 'Chak-chak', ar: 'تشاك تشاك', ms: 'Chak-chak', zh: '恰克恰克蜜糖酥' },
      desc: {
        ru: 'Хрустящее тесто в медовом сиропе',
        uz: 'Asal siropidagi qarsildoq xamir',
        en: 'Crispy dough in honey syrup',
        ar: 'عجينة مقرمشة بشراب العسل',
        ms: 'Doh rangup dalam sirap madu',
        zh: '酥脆面条裹蜂蜜糖浆',
      },
      allergens: ['gluten', 'eggs'],
    },
    {
      id: 'pakhlava', category: 'desserts', price: 16, weight: 120, unit: 'g', kcal: 480, tags: ['hit', 'veg'],
      name: { ru: 'Пахлава', uz: 'Pahlava', en: 'Pakhlava', ar: 'بقلاوة', ms: 'Baklava', zh: '帕赫拉瓦千层酥' },
      desc: {
        ru: 'Слоёная, с грецким орехом и мёдом',
        uz: "Yong'oq va asal bilan qatlamli",
        en: 'Layered pastry with walnuts and honey',
        ar: 'رقائق عجين بالجوز والعسل',
        ms: 'Pastri berlapis dengan walnut dan madu',
        zh: '核桃蜂蜜千层酥',
      },
      allergens: ['gluten', 'nuts', 'milk'],
    },
    {
      id: 'nishalda', category: 'desserts', price: 12, weight: 120, unit: 'g', kcal: 280, tags: ['veg'],
      name: { ru: 'Нишалда', uz: 'Nisholda', en: 'Nishalda', ar: 'نيشالدا', ms: 'Nishalda', zh: '尼沙尔达白糖霜' },
      desc: {
        ru: 'Воздушная белая сладость из белков и сахара',
        uz: 'Tuxum oqi va shakardan tayyorlangan havodor oq shirinlik',
        en: 'Airy white sweet made of egg whites and sugar',
        ar: 'حلوى بيضاء هشة من بياض البيض والسكر',
        ms: 'Manisan putih gebu daripada putih telur dan gula',
        zh: '用蛋白和糖做成的蓬松白色甜点',
      },
      allergens: ['eggs'],
    },

    // ---------- Чай и напитки ----------
    {
      id: 'green-tea', category: 'drinks', price: 10, weight: 800, unit: 'ml', tags: ['hit'],
      name: { ru: 'Зелёный чай (чайник)', uz: "Ko'k choy (choynak)", en: 'Green tea (pot)', ar: 'شاي أخضر (إبريق)', ms: 'Teh Hijau (seteko)', zh: '绿茶（壶）' },
      desc: {
        ru: 'Классический кок-чой к плову',
        uz: "Palovga klassik ko'k choy",
        en: 'Classic kok-choy to go with plov',
        ar: 'الشاي الأخضر التقليدي مع البلوف',
        ms: 'Teh hijau klasik untuk dinikmati bersama plov',
        zh: '经典绿茶，配抓饭',
      },
    },
    {
      id: 'black-tea', category: 'drinks', price: 10, weight: 800, unit: 'ml',
      name: { ru: 'Чёрный чай с лимоном (чайник)', uz: 'Limonli qora choy (choynak)', en: 'Black tea with lemon (pot)', ar: 'شاي أسود بالليمون (إبريق)', ms: 'Teh Hitam dengan Lemon (seteko)', zh: '柠檬红茶（壶）' },
      desc: {
        ru: 'Подаётся с сахаром и лимоном',
        uz: 'Shakar va limon bilan tortiladi',
        en: 'Served with sugar and lemon',
        ar: 'يُقدَّم مع السكر والليمون',
        ms: 'Dihidang dengan gula dan lemon',
        zh: '配糖和柠檬',
      },
    },
    {
      id: 'kompot', category: 'drinks', price: 9, weight: 400, unit: 'ml', kcal: 120,
      name: { ru: 'Компот из сухофруктов', uz: 'Quruq meva kompoti', en: 'Dried-fruit kompot', ar: 'كومبوت الفواكه المجففة', ms: 'Kompot Buah Kering', zh: '干果饮' },
      desc: {
        ru: 'Курага, изюм, яблоко',
        uz: "O'rik qoqi, mayiz, olma",
        en: 'Apricot, raisin and apple',
        ar: 'مشمش مجفف، زبيب، تفاح',
        ms: 'Aprikot, kismis dan epal',
        zh: '杏干、葡萄干和苹果',
      },
    },
    {
      id: 'ayran', category: 'drinks', price: 8, weight: 300, unit: 'ml', kcal: 100,
      name: { ru: 'Айран', uz: 'Ayron', en: 'Ayran', ar: 'عيران', ms: 'Ayran', zh: '艾兰酸奶饮' },
      desc: {
        ru: 'Холодный, с зеленью',
        uz: "Sovuq, ko'katlar bilan",
        en: 'Chilled, with herbs',
        ar: 'بارد، مع الأعشاب',
        ms: 'Sejuk, dengan herba',
        zh: '冰镇，加香草',
      },
      allergens: ['milk'],
    },
  ],
};
