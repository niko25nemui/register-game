export type ProductCategory =
  | 'drink'
  | 'onigiri'
  | 'bread'
  | 'ramen'

export type Product = {
  id: string
  name: string
  qrValue: string
  category: ProductCategory
  emoji: string
}

// 商品を追加・削除・変更するときは、この一覧だけを編集します。
// id と qrValue は印刷済みQRコードと対応するため、名称だけを変える場合は変更しません。
export const products: Product[] = [
  {
    id: 'melon-bread',
    name: 'メロンパン',
    qrValue: 'REGAME:v2:melon-bread',
    category: 'bread',
    emoji: '🍈',
  },
  {
    id: 'koppe-bread',
    name: 'コッペパン',
    qrValue: 'REGAME:v2:koppe-bread',
    category: 'bread',
    emoji: '🥖',
  },
  {
    id: 'wiener-bread',
    name: 'ウィンナーパン',
    qrValue: 'REGAME:v2:wiener-bread',
    category: 'bread',
    emoji: '🌭',
  },
  {
    id: 'twist-bread',
    name: 'ツイストパン',
    qrValue: 'REGAME:v2:twist-bread',
    category: 'bread',
    emoji: '🥨',
  },
  {
    id: 'croissant',
    name: 'クロワッサン',
    qrValue: 'REGAME:v2:croissant',
    category: 'bread',
    emoji: '🥐',
  },
  {
    id: 'donut',
    name: 'ドーナツ',
    qrValue: 'REGAME:v2:donut',
    category: 'bread',
    emoji: '🍩',
  },
  {
    id: 'old-fashioned',
    name: 'オールドファッション',
    qrValue: 'REGAME:v2:old-fashioned',
    category: 'bread',
    emoji: '🍩',
  },
  {
    id: 'yakisoba-bread',
    name: 'やきそばパン',
    qrValue: 'REGAME:v2:yakisoba-bread',
    category: 'bread',
    emoji: '🥖',
  },
  {
    id: 'shoyu-ramen',
    name: '醤油ラーメン',
    qrValue: 'REGAME:v2:shoyu-ramen',
    category: 'ramen',
    emoji: '🍜',
  },
  {
    id: 'shio-ramen',
    name: '塩ラーメン',
    qrValue: 'REGAME:v2:shio-ramen',
    category: 'ramen',
    emoji: '🍜',
  },
  {
    id: 'miso-ramen',
    name: '味噌ラーメン',
    qrValue: 'REGAME:v2:miso-ramen',
    category: 'ramen',
    emoji: '🍜',
  },
  {
    id: 'tonkotsu-ramen',
    name: '豚骨ラーメン',
    qrValue: 'REGAME:v2:tonkotsu-ramen',
    category: 'ramen',
    emoji: '🍜',
  },
  {
    id: 'salmon-onigiri',
    name: '鮭おにぎり',
    qrValue: 'REGAME:v2:salmon-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'ume-onigiri',
    name: '梅おにぎり',
    qrValue: 'REGAME:v2:ume-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'tuna-mayo-onigiri',
    name: 'ツナマヨおにぎり',
    qrValue: 'REGAME:v2:tuna-mayo-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'kombu-onigiri',
    name: '昆布おにぎり',
    qrValue: 'REGAME:v2:kombu-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'aa-lemon',
    name: 'A・Aレモン',
    qrValue: 'REGAME:v2:aa-lemon',
    category: 'drink',
    emoji: '🍋',
  },
  {
    id: 'morning-tea',
    name: '午前の紅茶',
    qrValue: 'REGAME:v2:morning-tea',
    category: 'drink',
    emoji: '🫖',
  },
  {
    id: 'pirukasu',
    name: 'ピルカス',
    qrValue: 'REGAME:v2:pirukasu',
    category: 'drink',
    emoji: '🥤',
  },
  {
    id: 'kami-cola',
    name: 'カミコーラー',
    qrValue: 'REGAME:v2:kami-cola',
    category: 'drink',
    emoji: '🥤',
  },
  {
    id: 'yoi-ocha',
    name: 'よ〜いお茶',
    qrValue: 'REGAME:v2:yoi-ocha',
    category: 'drink',
    emoji: '🍵',
  },
]
