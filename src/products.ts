export type ProductCategory =
  | 'drink'
  | 'onigiri'
  | 'bread'
  | 'ramen'
  | 'bento'

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
    id: 'twist-bread',
    name: 'ツイストパン',
    qrValue: 'REGAME:v2:twist-bread',
    category: 'bread',
    emoji: '🥨',
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
    id: 'croissant',
    name: 'クロワッサン',
    qrValue: 'REGAME:v2:croissant',
    category: 'bread',
    emoji: '🥐',
  },
  {
    id: 'yakisoba-bread',
    name: '焼きそばパン',
    qrValue: 'REGAME:v2:yakisoba-bread',
    category: 'bread',
    emoji: '🥖',
  },
  {
    id: 'tantanmen',
    name: '担々麺',
    qrValue: 'REGAME:v2:tantanmen',
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
    id: 'okaka-onigiri',
    name: 'おかかおにぎり',
    qrValue: 'REGAME:v2:okaka-onigiri',
    category: 'onigiri',
    emoji: '🍙',
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
    name: '梅干しおにぎり',
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
    id: 'bento',
    name: 'お弁当',
    qrValue: 'REGAME:v2:bento',
    category: 'bento',
    emoji: '🍱',
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
    name: 'カココーラー',
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
