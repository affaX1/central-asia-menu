// =====================================================================
//  МЕНЮ РЕСТОРАНА — всё, что видит гость, меняется только здесь.
//
//  Как добавить блюдо: скопируй любой блок { id: ... } в списке dishes,
//  поменяй id (любое уникальное слово латиницей), название, цену.
//
//  Поля блюда:
//    id          — уникальный код блюда (латиница, без пробелов)
//    category    — id категории из списка categories
//    name, desc  — название и описание на каждом языке
//    price       — цена числом
//    weight/unit — выход: число и 'g' (граммы), 'ml' (миллилитры) или 'pcs' (штуки)
//    kcal        — калории (можно не писать)
//    emoji       — картинка, пока нет фото
//    photo       — путь к фото, например 'photos/plov.jpg' (тогда emoji не нужен)
//    tags        — 'hit' хит, 'new' новинка, 'spicy' острое, 'veg' без мяса
//    ingredients — состав (можно не писать)
//    allergens   — gluten, milk, eggs, fish, shellfish, nuts, soy, sesame
//    hidden      — true, чтобы временно убрать блюдо из меню (стоп-лист)
//
//  ЦЕНЫ НИЖЕ — ПРИМЕРНЫЕ. Поменяй на свои.
// =====================================================================

window.MENU = {
  languages: ['ru', 'en'],

  restaurant: {
    name: { ru: 'Central Asia Restaurant', en: 'Central Asia Restaurant' },
    tagline: { ru: 'Узбекская кухня', en: 'Uzbek cuisine' },
    logo: '🍛',
    currency: '₽',
    open: '10:00',   // открытие, каждый день
    close: '22:00',  // закрытие
    address: { ru: 'ул. Примерная, 1', en: '1 Example St.' },
    phone: '+7 900 000-00-00',
    footer: { ru: 'Цены и наличие блюд уточняйте у официанта.', en: 'Please ask your waiter about prices and availability.' },
  },

  categories: [
    { id: 'plov', emoji: '🍛', hue: 38, name: { ru: 'Плов', en: 'Plov' } },
    { id: 'soups', emoji: '🍲', hue: 25, name: { ru: 'Супы', en: 'Soups' } },
    { id: 'mains', emoji: '🥟', hue: 15, name: { ru: 'Горячее', en: 'Mains' } },
    { id: 'grill', emoji: '🍢', hue: 5, name: { ru: 'Шашлык', en: 'Grill' } },
    { id: 'bakery', emoji: '🫓', hue: 45, name: { ru: 'Самса и лепёшки', en: 'Samsa & bread' } },
    { id: 'salads', emoji: '🥗', hue: 100, name: { ru: 'Салаты', en: 'Salads' } },
    { id: 'desserts', emoji: '🍯', hue: 330, name: { ru: 'Сладкое', en: 'Desserts' } },
    { id: 'drinks', emoji: '🍵', hue: 160, name: { ru: 'Чай и напитки', en: 'Tea & drinks' } },
  ],

  dishes: [
    // ---------- Плов ----------
    {
      id: 'plov-tashkent', category: 'plov', price: 450, weight: 350, unit: 'g', kcal: 720, emoji: '🍛', tags: ['hit'],
      name: { ru: 'Ташкентский плов', en: 'Tashkent plov' },
      desc: { ru: 'Рис девзира, баранина, жёлтая морковь, нут и перепелиное яйцо', en: 'Devzira rice, lamb, yellow carrots, chickpeas and a quail egg' },
      ingredients: { ru: 'рис, баранина, морковь, нут, лук, чеснок, зира, перепелиное яйцо', en: 'rice, lamb, carrots, chickpeas, onion, garlic, cumin, quail egg' },
      allergens: ['eggs'],
    },
    {
      id: 'plov-samarkand', category: 'plov', price: 450, weight: 350, unit: 'g', kcal: 700, emoji: '🍚',
      name: { ru: 'Самаркандский плов', en: 'Samarkand plov' },
      desc: { ru: 'Готовится слоями: морковь и мясо сверху, рис не перемешивают', en: 'Cooked in layers, with carrots and meat on top of the rice' },
    },
    {
      id: 'plov-wedding', category: 'plov', price: 550, weight: 380, unit: 'g', kcal: 790, emoji: '🍛', tags: ['new'],
      name: { ru: 'Свадебный плов с кази', en: 'Wedding plov with kazy' },
      desc: { ru: 'Праздничный плов с конской колбасой кази, изюмом и нутом', en: 'Festive plov with kazy horse sausage, raisins and chickpeas' },
    },

    // ---------- Супы ----------
    {
      id: 'lagman-soup', category: 'soups', price: 420, weight: 400, unit: 'g', kcal: 480, emoji: '🍜', tags: ['hit'],
      name: { ru: 'Лагман', en: 'Lagman' },
      desc: { ru: 'Тянутая вручную лапша, говядина, овощи и наваристый бульон', en: 'Hand-pulled noodles, beef, vegetables and rich broth' },
      allergens: ['gluten'],
    },
    {
      id: 'shurpa', category: 'soups', price: 420, weight: 400, unit: 'g', kcal: 390, emoji: '🍲',
      name: { ru: 'Шурпа', en: 'Shurpa' },
      desc: { ru: 'Прозрачный бульон из баранины с картофелем, морковью и зеленью', en: 'Clear lamb broth with potatoes, carrots and herbs' },
    },
    {
      id: 'mastava', category: 'soups', price: 380, weight: 400, unit: 'g', kcal: 360, emoji: '🥣',
      name: { ru: 'Мастава', en: 'Mastava' },
      desc: { ru: 'Рисовый суп с мясом и овощами, подаётся с катыком', en: 'Rice soup with meat and vegetables, served with katyk yoghurt' },
      allergens: ['milk'],
    },

    // ---------- Горячее ----------
    {
      id: 'manty', category: 'mains', price: 450, weight: 4, unit: 'pcs', kcal: 640, emoji: '🥟', tags: ['hit'],
      name: { ru: 'Манты с бараниной', en: 'Manty with lamb' },
      desc: { ru: 'На пару, с рубленой бараниной и луком. Подаются со сметаной', en: 'Steamed dumplings with chopped lamb and onion, served with sour cream' },
      allergens: ['gluten', 'milk'],
    },
    {
      id: 'manty-pumpkin', category: 'mains', price: 390, weight: 4, unit: 'pcs', kcal: 420, emoji: '🥟', tags: ['veg'],
      name: { ru: 'Манты с тыквой', en: 'Manty with pumpkin' },
      desc: { ru: 'Сладковатая тыква с луком, на пару', en: 'Steamed dumplings with sweet pumpkin and onion' },
      allergens: ['gluten'],
    },
    {
      id: 'chuchvara', category: 'mains', price: 390, weight: 300, unit: 'g', kcal: 560, emoji: '🥟',
      name: { ru: 'Чучвара', en: 'Chuchvara' },
      desc: { ru: 'Маленькие узбекские пельмени в бульоне или жареные', en: 'Small Uzbek dumplings, in broth or fried' },
      allergens: ['gluten', 'eggs'],
    },
    {
      id: 'guiru-lagman', category: 'mains', price: 470, weight: 380, unit: 'g', kcal: 620, emoji: '🍝', tags: ['spicy'],
      name: { ru: 'Гуйру лагман', en: 'Guiru lagman' },
      desc: { ru: 'Жареная лапша с говядиной, перцем и овощами', en: 'Stir-fried noodles with beef, peppers and vegetables' },
      allergens: ['gluten'],
    },
    {
      id: 'dimlama', category: 'mains', price: 490, weight: 450, unit: 'g', kcal: 540, emoji: '🥘',
      name: { ru: 'Димляма', en: 'Dimlama' },
      desc: { ru: 'Мясо, томлённое с картофелем, капустой и овощами', en: 'Meat slow-braised with potatoes, cabbage and vegetables' },
    },
    {
      id: 'kazan-kebab', category: 'mains', price: 650, weight: 350, unit: 'g', kcal: 780, emoji: '🍖',
      name: { ru: 'Казан-кебаб', en: 'Kazan kebab' },
      desc: { ru: 'Баранина на косточке с картофелем, обжаренные в казане', en: 'Lamb on the bone with potatoes, fried in a kazan' },
    },

    // ---------- Шашлык ----------
    {
      id: 'shashlik-lamb', category: 'grill', price: 490, weight: 200, unit: 'g', kcal: 520, emoji: '🍢', tags: ['hit'],
      name: { ru: 'Шашлык из баранины', en: 'Lamb shashlik' },
      desc: { ru: 'На углях, с маринованным луком и лепёшкой', en: 'Charcoal-grilled, with pickled onion and flatbread' },
      allergens: ['gluten'],
    },
    {
      id: 'lyulya', category: 'grill', price: 420, weight: 200, unit: 'g', kcal: 480, emoji: '🍢',
      name: { ru: 'Люля-кебаб', en: 'Lyulya kebab' },
      desc: { ru: 'Рубленая баранина с курдючным жиром и специями', en: 'Minced lamb with tail fat and spices' },
    },
    {
      id: 'shashlik-chicken', category: 'grill', price: 380, weight: 200, unit: 'g', kcal: 360, emoji: '🍗',
      name: { ru: 'Шашлык из курицы', en: 'Chicken shashlik' },
      desc: { ru: 'Бедро в маринаде, на углях', en: 'Marinated chicken thigh, charcoal-grilled' },
    },
    {
      id: 'jigar', category: 'grill', price: 350, weight: 200, unit: 'g', kcal: 330, emoji: '🍢',
      name: { ru: 'Жигар (печень)', en: 'Jigar (liver)' },
      desc: { ru: 'Баранья печень на углях с курдюком', en: 'Lamb liver grilled with tail fat' },
    },

    // ---------- Самса и лепёшки ----------
    {
      id: 'samsa-meat', category: 'bakery', price: 180, weight: 1, unit: 'pcs', kcal: 380, emoji: '🥟', tags: ['hit'],
      name: { ru: 'Самса с бараниной', en: 'Lamb samsa' },
      desc: { ru: 'Из тандыра, слоёное тесто, сочная начинка', en: 'Tandoor-baked puff pastry with juicy lamb filling' },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'samsa-chicken', category: 'bakery', price: 160, weight: 1, unit: 'pcs', kcal: 340, emoji: '🥟',
      name: { ru: 'Самса с курицей', en: 'Chicken samsa' },
      desc: { ru: 'Из тандыра, с курицей и луком', en: 'Tandoor-baked, with chicken and onion' },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'samsa-pumpkin', category: 'bakery', price: 150, weight: 1, unit: 'pcs', kcal: 260, emoji: '🥟', tags: ['veg'],
      name: { ru: 'Самса с тыквой', en: 'Pumpkin samsa' },
      desc: { ru: 'Из тандыра, с тыквой и луком', en: 'Tandoor-baked, with pumpkin and onion' },
      allergens: ['gluten', 'sesame'],
    },
    {
      id: 'non', category: 'bakery', price: 90, weight: 1, unit: 'pcs', emoji: '🫓', tags: ['veg'],
      name: { ru: 'Лепёшка тандырная', en: 'Tandoor flatbread' },
      desc: { ru: 'Горячая, с кунжутом и чернушкой', en: 'Hot, with sesame and nigella seeds' },
      allergens: ['gluten', 'sesame'],
    },

    // ---------- Салаты ----------
    {
      id: 'achichuk', category: 'salads', price: 250, weight: 200, unit: 'g', kcal: 90, emoji: '🍅', tags: ['veg'],
      name: { ru: 'Ачичук', en: 'Achichuk' },
      desc: { ru: 'Томаты, сладкий лук и острый перец — лучшая пара к плову', en: 'Tomatoes, sweet onion and hot pepper, best with plov' },
    },
    {
      id: 'tashkent-salad', category: 'salads', price: 390, weight: 220, unit: 'g', kcal: 310, emoji: '🥗',
      name: { ru: 'Салат «Ташкент»', en: 'Tashkent salad' },
      desc: { ru: 'Зелёная редька, отварная говядина, жареный лук и яйцо', en: 'Green radish, boiled beef, fried onion and egg' },
      allergens: ['eggs'],
    },
    {
      id: 'fresh-veg', category: 'salads', price: 290, weight: 250, unit: 'g', kcal: 70, emoji: '🥒', tags: ['veg'],
      name: { ru: 'Свежие овощи с зеленью', en: 'Fresh vegetables & herbs' },
      desc: { ru: 'Огурцы, томаты, перец, редис, зелень', en: 'Cucumbers, tomatoes, peppers, radish, herbs' },
    },

    // ---------- Сладкое ----------
    {
      id: 'chak-chak', category: 'desserts', price: 290, weight: 150, unit: 'g', kcal: 520, emoji: '🍯', tags: ['veg'],
      name: { ru: 'Чак-чак', en: 'Chak-chak' },
      desc: { ru: 'Хрустящее тесто в медовом сиропе', en: 'Crispy dough in honey syrup' },
      allergens: ['gluten', 'eggs'],
    },
    {
      id: 'pakhlava', category: 'desserts', price: 320, weight: 120, unit: 'g', kcal: 480, emoji: '🥮', tags: ['hit', 'veg'],
      name: { ru: 'Пахлава', en: 'Pakhlava' },
      desc: { ru: 'Слоёная, с грецким орехом и мёдом', en: 'Layered pastry with walnuts and honey' },
      allergens: ['gluten', 'nuts', 'milk'],
    },
    {
      id: 'nishalda', category: 'desserts', price: 250, weight: 120, unit: 'g', kcal: 280, emoji: '🍮', tags: ['veg'],
      name: { ru: 'Нишалда', en: 'Nishalda' },
      desc: { ru: 'Воздушная белая сладость из белков и сахара', en: 'Airy white sweet made of egg whites and sugar' },
      allergens: ['eggs'],
    },

    // ---------- Чай и напитки ----------
    {
      id: 'green-tea', category: 'drinks', price: 250, weight: 800, unit: 'ml', emoji: '🍵', tags: ['hit'],
      name: { ru: 'Зелёный чай (чайник)', en: 'Green tea (pot)' },
      desc: { ru: 'Классический кок-чой к плову', en: 'Classic kok-choy to go with plov' },
    },
    {
      id: 'black-tea', category: 'drinks', price: 250, weight: 800, unit: 'ml', emoji: '🫖',
      name: { ru: 'Чёрный чай с лимоном (чайник)', en: 'Black tea with lemon (pot)' },
      desc: { ru: 'Подаётся с сахаром и лимоном', en: 'Served with sugar and lemon' },
    },
    {
      id: 'kompot', category: 'drinks', price: 200, weight: 400, unit: 'ml', kcal: 120, emoji: '🍹',
      name: { ru: 'Компот из сухофруктов', en: 'Dried-fruit kompot' },
      desc: { ru: 'Курага, изюм, яблоко', en: 'Apricot, raisin and apple' },
    },
    {
      id: 'ayran', category: 'drinks', price: 180, weight: 300, unit: 'ml', kcal: 100, emoji: '🥛',
      name: { ru: 'Айран', en: 'Ayran' },
      desc: { ru: 'Холодный, с зеленью', en: 'Chilled, with herbs' },
      allergens: ['milk'],
    },
  ],
};
