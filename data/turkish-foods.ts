// TÜRKOMP (Türk Gıda Kompozisyon Veritabanı) referanslı değerler
// Tüm değerler 100g başına

export interface SeedFood {
  name: string;
  name_tr: string;
  category: string;
  calories_per_100g: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  serving_size: number;
  serving_unit: string;
  is_turkish: boolean;
}

export const turkishFoods: SeedFood[] = [
  // === KAHVALTI ===
  { name: 'White Cheese (Beyaz Peynir)', name_tr: 'Beyaz Peynir', category: 'Süt Ürünleri', calories_per_100g: 264, protein: 18, carbs: 2, fat: 21, fiber: 0, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Kasar Cheese', name_tr: 'Kaşar Peyniri', category: 'Süt Ürünleri', calories_per_100g: 356, protein: 25, carbs: 2, fat: 28, fiber: 0, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Turkish Sujuk', name_tr: 'Sucuk', category: 'Et & Şarküteri', calories_per_100g: 385, protein: 22, carbs: 2, fat: 33, fiber: 0, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Turkish Pastirma', name_tr: 'Pastırma', category: 'Et & Şarküteri', calories_per_100g: 193, protein: 28, carbs: 3, fat: 8, fiber: 0, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Kaymak', name_tr: 'Kaymak', category: 'Süt Ürünleri', calories_per_100g: 381, protein: 4, carbs: 4, fat: 39, fiber: 0, serving_size: 20, serving_unit: 'g', is_turkish: true },
  { name: 'Honey', name_tr: 'Bal', category: 'Tatlandırıcılar', calories_per_100g: 304, protein: 0.4, carbs: 82, fat: 0, fiber: 0, serving_size: 20, serving_unit: 'g', is_turkish: false },
  { name: 'Black Olive', name_tr: 'Siyah Zeytin', category: 'Sebze & Meyve', calories_per_100g: 199, protein: 1.4, carbs: 6, fat: 20, fiber: 3.2, serving_size: 30, serving_unit: 'g', is_turkish: false },
  { name: 'Green Olive', name_tr: 'Yeşil Zeytin', category: 'Sebze & Meyve', calories_per_100g: 145, protein: 1.0, carbs: 4, fat: 15, fiber: 2.5, serving_size: 30, serving_unit: 'g', is_turkish: false },
  { name: 'Turkish Tea', name_tr: 'Çay (sade)', category: 'İçecekler', calories_per_100g: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0, serving_size: 200, serving_unit: 'ml', is_turkish: true },
  { name: 'Egg Boiled', name_tr: 'Haşlanmış Yumurta', category: 'Yumurta', calories_per_100g: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, serving_size: 60, serving_unit: 'g', is_turkish: false },
  { name: 'Menemen', name_tr: 'Menemen', category: 'Kahvaltılık', calories_per_100g: 112, protein: 7, carbs: 6, fat: 7, fiber: 1.2, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Simit', name_tr: 'Simit', category: 'Ekmek & Hamurişi', calories_per_100g: 312, protein: 10, carbs: 57, fat: 5, fiber: 2.5, serving_size: 120, serving_unit: 'g', is_turkish: true },
  { name: 'Pogaca', name_tr: 'Poğaça', category: 'Ekmek & Hamurişi', calories_per_100g: 335, protein: 8, carbs: 45, fat: 15, fiber: 1.5, serving_size: 80, serving_unit: 'g', is_turkish: true },
  { name: 'Tahini', name_tr: 'Tahin', category: 'Kahvaltılık', calories_per_100g: 595, protein: 17, carbs: 23, fat: 53, fiber: 9, serving_size: 20, serving_unit: 'g', is_turkish: false },
  { name: 'Pekmez', name_tr: 'Pekmez', category: 'Tatlandırıcılar', calories_per_100g: 290, protein: 2, carbs: 70, fat: 0.2, fiber: 1, serving_size: 20, serving_unit: 'g', is_turkish: true },

  // === ANA YEMEKLER - ET ===
  { name: 'Kofte (Meatball)', name_tr: 'Köfte', category: 'Et Yemekleri', calories_per_100g: 236, protein: 18, carbs: 8, fat: 15, fiber: 0.5, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Adana Kebab', name_tr: 'Adana Kebabı', category: 'Et Yemekleri', calories_per_100g: 245, protein: 20, carbs: 5, fat: 17, fiber: 0.3, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Iskender Kebab', name_tr: 'İskender Kebabı', category: 'Et Yemekleri', calories_per_100g: 196, protein: 14, carbs: 13, fat: 11, fiber: 0.8, serving_size: 300, serving_unit: 'g', is_turkish: true },
  { name: 'Doner Kebab', name_tr: 'Döner Kebabı', category: 'Et Yemekleri', calories_per_100g: 217, protein: 17, carbs: 6, fat: 15, fiber: 0, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Chicken Doner', name_tr: 'Tavuk Döner', category: 'Tavuk Yemekleri', calories_per_100g: 172, protein: 21, carbs: 5, fat: 8, fiber: 0, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Lamb Chops (Pirzola)', name_tr: 'Pirzola', category: 'Et Yemekleri', calories_per_100g: 258, protein: 22, carbs: 0, fat: 18, fiber: 0, serving_size: 200, serving_unit: 'g', is_turkish: false },
  { name: 'Grilled Chicken Breast', name_tr: 'Izgara Tavuk Göğsü', category: 'Tavuk Yemekleri', calories_per_100g: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'Chicken Thigh Grilled', name_tr: 'Izgara Tavuk But', category: 'Tavuk Yemekleri', calories_per_100g: 177, protein: 26, carbs: 0, fat: 8, fiber: 0, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'Lahmacun', name_tr: 'Lahmacun', category: 'Et Yemekleri', calories_per_100g: 265, protein: 14, carbs: 32, fat: 9, fiber: 2, serving_size: 130, serving_unit: 'g', is_turkish: true },
  { name: 'Pide with Meat', name_tr: 'Kıymalı Pide', category: 'Et Yemekleri', calories_per_100g: 248, protein: 12, carbs: 32, fat: 8, fiber: 1.5, serving_size: 250, serving_unit: 'g', is_turkish: true },

  // === ANA YEMEKLER - SEBZE ===
  { name: 'Imam Bayildi', name_tr: 'İmam Bayıldı', category: 'Sebze Yemekleri', calories_per_100g: 94, protein: 1.5, carbs: 8, fat: 6, fiber: 2.5, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Stuffed Peppers (Dolma)', name_tr: 'Biber Dolması', category: 'Sebze Yemekleri', calories_per_100g: 142, protein: 5, carbs: 16, fat: 7, fiber: 2, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Grape Leaves (Sarma)', name_tr: 'Yaprak Sarması', category: 'Sebze Yemekleri', calories_per_100g: 156, protein: 4, carbs: 18, fat: 8, fiber: 2.5, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Zucchini with Minced Meat', name_tr: 'Kabak Yemeği', category: 'Sebze Yemekleri', calories_per_100g: 89, protein: 5, carbs: 6, fat: 5, fiber: 1.5, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Eggplant Moussaka', name_tr: 'Patlıcan Musakka', category: 'Sebze Yemekleri', calories_per_100g: 128, protein: 7, carbs: 8, fat: 8, fiber: 2, serving_size: 250, serving_unit: 'g', is_turkish: true },
  { name: 'Leek with Olive Oil', name_tr: 'Zeytinyağlı Pırasa', category: 'Sebze Yemekleri', calories_per_100g: 78, protein: 2, carbs: 8, fat: 4.5, fiber: 2.5, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Green Beans with Olive Oil', name_tr: 'Zeytinyağlı Taze Fasulye', category: 'Sebze Yemekleri', calories_per_100g: 65, protein: 1.8, carbs: 7, fat: 3.5, fiber: 3, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Spinach with Yogurt', name_tr: 'Ispanak Yoğurtlu', category: 'Sebze Yemekleri', calories_per_100g: 82, protein: 5, carbs: 6, fat: 4, fiber: 2, serving_size: 200, serving_unit: 'g', is_turkish: true },

  // === ÇORBALAR ===
  { name: 'Lentil Soup', name_tr: 'Mercimek Çorbası', category: 'Çorbalar', calories_per_100g: 62, protein: 4, carbs: 9, fat: 1.5, fiber: 2, serving_size: 250, serving_unit: 'ml', is_turkish: true },
  { name: 'Ezogelin Soup', name_tr: 'Ezogelin Çorbası', category: 'Çorbalar', calories_per_100g: 68, protein: 4, carbs: 11, fat: 1.8, fiber: 2.5, serving_size: 250, serving_unit: 'ml', is_turkish: true },
  { name: 'Tomato Soup', name_tr: 'Domates Çorbası', category: 'Çorbalar', calories_per_100g: 45, protein: 2, carbs: 7, fat: 1.5, fiber: 1, serving_size: 250, serving_unit: 'ml', is_turkish: false },
  { name: 'Tripe Soup (Iskembe)', name_tr: 'İşkembe Çorbası', category: 'Çorbalar', calories_per_100g: 72, protein: 8, carbs: 4, fat: 3, fiber: 0, serving_size: 250, serving_unit: 'ml', is_turkish: true },
  { name: 'Chicken Noodle Soup', name_tr: 'Şehriyeli Tavuk Çorbası', category: 'Çorbalar', calories_per_100g: 55, protein: 5, carbs: 6, fat: 1.5, fiber: 0.5, serving_size: 250, serving_unit: 'ml', is_turkish: true },
  { name: 'Yogurt Soup', name_tr: 'Yoğurt Çorbası', category: 'Çorbalar', calories_per_100g: 58, protein: 3.5, carbs: 7, fat: 2, fiber: 0.5, serving_size: 250, serving_unit: 'ml', is_turkish: true },

  // === PİLAV & MAKARNA ===
  { name: 'Rice Pilaf', name_tr: 'Pirinç Pilavı', category: 'Tahıllar', calories_per_100g: 174, protein: 3.5, carbs: 38, fat: 1.5, fiber: 0.5, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Bulgur Pilaf', name_tr: 'Bulgur Pilavı', category: 'Tahıllar', calories_per_100g: 151, protein: 4, carbs: 30, fat: 2, fiber: 4, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Turkish Pasta', name_tr: 'Makarna (haşlanmış)', category: 'Tahıllar', calories_per_100g: 158, protein: 5.5, carbs: 31, fat: 1.2, fiber: 1.8, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'White Bread', name_tr: 'Ekmek (beyaz)', category: 'Ekmek & Hamurişi', calories_per_100g: 265, protein: 9, carbs: 49, fat: 3, fiber: 2.7, serving_size: 50, serving_unit: 'g', is_turkish: false },
  { name: 'Whole Wheat Bread', name_tr: 'Tam Buğday Ekmeği', category: 'Ekmek & Hamurişi', calories_per_100g: 247, protein: 10, carbs: 42, fat: 3.5, fiber: 6.5, serving_size: 50, serving_unit: 'g', is_turkish: false },

  // === BAKLIYATLAR ===
  { name: 'White Bean Stew', name_tr: 'Kuru Fasulye', category: 'Bakliyat Yemekleri', calories_per_100g: 128, protein: 8, carbs: 17, fat: 3, fiber: 5, serving_size: 250, serving_unit: 'g', is_turkish: true },
  { name: 'Chickpea Stew', name_tr: 'Nohut Yemeği', category: 'Bakliyat Yemekleri', calories_per_100g: 142, protein: 7, carbs: 19, fat: 4, fiber: 6, serving_size: 250, serving_unit: 'g', is_turkish: true },
  { name: 'Red Lentil', name_tr: 'Kırmızı Mercimek', category: 'Bakliyat Yemekleri', calories_per_100g: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, serving_size: 200, serving_unit: 'g', is_turkish: false },
  { name: 'Black-eyed Pea', name_tr: 'Börülce', category: 'Bakliyat Yemekleri', calories_per_100g: 108, protein: 7, carbs: 16, fat: 1.5, fiber: 5, serving_size: 200, serving_unit: 'g', is_turkish: true },

  // === YOĞURT & SÜT ===
  { name: 'Plain Yogurt', name_tr: 'Yoğurt (tam yağlı)', category: 'Süt Ürünleri', calories_per_100g: 68, protein: 3.5, carbs: 4.7, fat: 3.8, fiber: 0, serving_size: 200, serving_unit: 'g', is_turkish: false },
  { name: 'Ayran', name_tr: 'Ayran', category: 'İçecekler', calories_per_100g: 38, protein: 2, carbs: 3, fat: 2, fiber: 0, serving_size: 200, serving_unit: 'ml', is_turkish: true },
  { name: 'Cacik', name_tr: 'Cacık', category: 'Mezeler', calories_per_100g: 52, protein: 2.5, carbs: 4, fat: 2.5, fiber: 0.5, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Whole Milk', name_tr: 'Tam Yağlı Süt', category: 'Süt Ürünleri', calories_per_100g: 61, protein: 3.2, carbs: 4.8, fat: 3.2, fiber: 0, serving_size: 200, serving_unit: 'ml', is_turkish: false },
  { name: 'Low Fat Yogurt', name_tr: 'Yoğurt (az yağlı)', category: 'Süt Ürünleri', calories_per_100g: 36, protein: 3.5, carbs: 5, fat: 0.2, fiber: 0, serving_size: 200, serving_unit: 'g', is_turkish: false },

  // === MEZELER & SALATALAR ===
  { name: 'Humus', name_tr: 'Humus', category: 'Mezeler', calories_per_100g: 166, protein: 7.9, carbs: 14, fat: 9.6, fiber: 6, serving_size: 80, serving_unit: 'g', is_turkish: false },
  { name: 'Haydari', name_tr: 'Haydari', category: 'Mezeler', calories_per_100g: 98, protein: 5, carbs: 5, fat: 7, fiber: 0.5, serving_size: 80, serving_unit: 'g', is_turkish: true },
  { name: 'Ezme', name_tr: 'Ezme', category: 'Mezeler', calories_per_100g: 42, protein: 1.5, carbs: 7, fat: 1.5, fiber: 2, serving_size: 80, serving_unit: 'g', is_turkish: true },
  { name: 'Shepherd Salad', name_tr: 'Çoban Salatası', category: 'Salatalar', calories_per_100g: 33, protein: 1.2, carbs: 6, fat: 0.4, fiber: 1.8, serving_size: 200, serving_unit: 'g', is_turkish: true },
  { name: 'Tabouleh', name_tr: 'Tabbule', category: 'Salatalar', calories_per_100g: 89, protein: 2.5, carbs: 13, fat: 3.5, fiber: 3, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'Kisir', name_tr: 'Kısır', category: 'Mezeler', calories_per_100g: 144, protein: 3.5, carbs: 24, fat: 4.5, fiber: 4, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Rocket Salad', name_tr: 'Roka Salatası', category: 'Salatalar', calories_per_100g: 45, protein: 3, carbs: 4, fat: 1.5, fiber: 1.5, serving_size: 100, serving_unit: 'g', is_turkish: false },

  // === TATLILER ===
  { name: 'Baklava', name_tr: 'Baklava', category: 'Tatlılar', calories_per_100g: 429, protein: 8, carbs: 46, fat: 25, fiber: 2, serving_size: 60, serving_unit: 'g', is_turkish: true },
  { name: 'Sutlac', name_tr: 'Sütlaç', category: 'Tatlılar', calories_per_100g: 102, protein: 3.5, carbs: 17, fat: 2.5, fiber: 0, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Turkish Delight', name_tr: 'Lokum', category: 'Tatlılar', calories_per_100g: 333, protein: 0.4, carbs: 83, fat: 0.3, fiber: 0.2, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Asure', name_tr: 'Aşure', category: 'Tatlılar', calories_per_100g: 137, protein: 3, carbs: 28, fat: 2, fiber: 3, serving_size: 150, serving_unit: 'g', is_turkish: true },
  { name: 'Kazandibi', name_tr: 'Kazandibi', category: 'Tatlılar', calories_per_100g: 152, protein: 4, carbs: 24, fat: 4.5, fiber: 0, serving_size: 150, serving_unit: 'g', is_turkish: true },

  // === MEYVELER ===
  { name: 'Apple', name_tr: 'Elma', category: 'Meyveler', calories_per_100g: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'Banana', name_tr: 'Muz', category: 'Meyveler', calories_per_100g: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, serving_size: 120, serving_unit: 'g', is_turkish: false },
  { name: 'Orange', name_tr: 'Portakal', category: 'Meyveler', calories_per_100g: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, serving_size: 150, serving_unit: 'g', is_turkish: false },
  { name: 'Watermelon', name_tr: 'Karpuz', category: 'Meyveler', calories_per_100g: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, serving_size: 300, serving_unit: 'g', is_turkish: false },
  { name: 'Grape', name_tr: 'Üzüm', category: 'Meyveler', calories_per_100g: 67, protein: 0.6, carbs: 17, fat: 0.4, fiber: 0.9, serving_size: 100, serving_unit: 'g', is_turkish: false },
  { name: 'Fig', name_tr: 'İncir', category: 'Meyveler', calories_per_100g: 74, protein: 0.8, carbs: 19, fat: 0.3, fiber: 2.9, serving_size: 60, serving_unit: 'g', is_turkish: true },
  { name: 'Pomegranate', name_tr: 'Nar', category: 'Meyveler', calories_per_100g: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4, serving_size: 150, serving_unit: 'g', is_turkish: true },

  // === ATISTIRMALIKLAR ===
  { name: 'Walnuts', name_tr: 'Ceviz', category: 'Kuruyemişler', calories_per_100g: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, serving_size: 30, serving_unit: 'g', is_turkish: false },
  { name: 'Hazelnuts', name_tr: 'Fındık', category: 'Kuruyemişler', calories_per_100g: 628, protein: 15, carbs: 17, fat: 61, fiber: 9.7, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Almonds', name_tr: 'Badem', category: 'Kuruyemişler', calories_per_100g: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, serving_size: 30, serving_unit: 'g', is_turkish: false },
  { name: 'Pistachio', name_tr: 'Antep Fıstığı', category: 'Kuruyemişler', calories_per_100g: 562, protein: 20, carbs: 28, fat: 45, fiber: 10, serving_size: 30, serving_unit: 'g', is_turkish: true },
  { name: 'Sunflower Seeds', name_tr: 'Ay Çekirdeği', category: 'Kuruyemişler', calories_per_100g: 584, protein: 21, carbs: 20, fat: 51, fiber: 8.6, serving_size: 30, serving_unit: 'g', is_turkish: false },
];

export const foodCategories = [
  'Kahvaltılık',
  'Et Yemekleri',
  'Tavuk Yemekleri',
  'Balık Yemekleri',
  'Sebze Yemekleri',
  'Çorbalar',
  'Tahıllar',
  'Ekmek & Hamurişi',
  'Bakliyat Yemekleri',
  'Süt Ürünleri',
  'Mezeler',
  'Salatalar',
  'Tatlılar',
  'Meyveler',
  'Kuruyemişler',
  'İçecekler',
  'Et & Şarküteri',
  'Yumurta',
  'Tatlandırıcılar',
];
