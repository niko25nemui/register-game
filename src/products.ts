export type ProductCategory =
  | 'drink'
  | 'onigiri'
  | 'bread'
  | 'stationery'

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
    id: 'cola',
    name: 'コーラ',
    qrValue: 'REGAME:v1:cola',
    category: 'drink',
    emoji: '🥤',
  },
  {
    id: 'ooicha',
    name: 'おーいお茶',
    qrValue: 'REGAME:v1:ooicha',
    category: 'drink',
    emoji: '🍵',
  },
  {
    id: 'natchan-orange',
    name: 'なっちゃんオレンジ',
    qrValue: 'REGAME:v1:natchan-orange',
    category: 'drink',
    emoji: '🍊',
  },
  {
    id: 'melon-soda',
    name: 'メロンソーダ',
    qrValue: 'REGAME:v1:melon-soda',
    category: 'drink',
    emoji: '🥤',
  },
  {
    id: 'coffee',
    name: 'コーヒー',
    qrValue: 'REGAME:v1:coffee',
    category: 'drink',
    emoji: '☕',
  },
  {
    id: 'strawberry-milk',
    name: 'いちごミルク',
    qrValue: 'REGAME:v1:strawberry-milk',
    category: 'drink',
    emoji: '🥛',
  },
  {
    id: 'salmon-onigiri',
    name: '鮭おにぎり',
    qrValue: 'REGAME:v1:salmon-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'ume-onigiri',
    name: '梅おにぎり',
    qrValue: 'REGAME:v1:ume-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'tuna-mayo-onigiri',
    name: 'ツナマヨおにぎり',
    qrValue: 'REGAME:v1:tuna-mayo-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'kombu-onigiri',
    name: 'こんぶおにぎり',
    qrValue: 'REGAME:v1:kombu-onigiri',
    category: 'onigiri',
    emoji: '🍙',
  },
  {
    id: 'sausage-bread',
    name: 'ソーセージパン',
    qrValue: 'REGAME:v1:sausage-bread',
    category: 'bread',
    emoji: '🌭',
  },
  {
    id: 'melon-bread',
    name: 'メロンパン',
    qrValue: 'REGAME:v1:melon-bread',
    category: 'bread',
    emoji: '🍈',
  },
  {
    id: 'notebook',
    name: 'ノート',
    qrValue: 'REGAME:v1:notebook',
    category: 'stationery',
    emoji: '📓',
  },
  {
    id: 'pen',
    name: 'ペン',
    qrValue: 'REGAME:v1:pen',
    category: 'stationery',
    emoji: '🖊️',
  },
  {
    id: 'eraser',
    name: '消しゴム',
    qrValue: 'REGAME:v1:eraser',
    category: 'stationery',
    emoji: '▰',
  },
]
