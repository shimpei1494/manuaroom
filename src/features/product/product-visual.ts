import {
  IconAirConditioning,
  IconBath,
  IconBed,
  IconBox,
  IconBulb,
  IconCar,
  IconCoffee,
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconDeviceTv,
  IconDroplet,
  IconFlame,
  IconFridge,
  IconMicrowave,
  IconPrinter,
  IconSofa,
  IconToolsKitchen2,
  IconVacuumCleaner,
  IconWashMachine,
  IconWind,
  type Icon,
} from "@tabler/icons-react";

type ProductVisual = { icon: Icon; color: string };

// カテゴリ、製品名の順に、含まれる言葉で見た目を決める (上のルールほど優先)
const RULES: { words: string[]; icon: Icon; color: string }[] = [
  { words: ["エアコン", "クーラー"], icon: IconAirConditioning, color: "cyan" },
  { words: ["洗濯", "乾燥機"], icon: IconWashMachine, color: "blue" },
  { words: ["冷蔵", "冷凍"], icon: IconFridge, color: "indigo" },
  {
    words: ["空気清浄", "加湿", "除湿", "換気", "扇風機", "サーキュレーター"],
    icon: IconWind,
    color: "teal",
  },
  { words: ["掃除機", "ルンバ", "ロボット掃除"], icon: IconVacuumCleaner, color: "violet" },
  { words: ["電子レンジ", "オーブン", "レンジ"], icon: IconMicrowave, color: "orange" },
  {
    words: ["食洗", "食器", "キッチン", "炊飯", "コンロ", "IH"],
    icon: IconToolsKitchen2,
    color: "apricot",
  },
  { words: ["コーヒー", "ケトル", "ポット"], icon: IconCoffee, color: "orange" },
  { words: ["浄水", "給水", "ウォーター"], icon: IconDroplet, color: "blue" },
  { words: ["給湯", "ボイラー", "ストーブ", "ヒーター", "暖房"], icon: IconFlame, color: "red" },
  { words: ["風呂", "浴室", "トイレ", "洗面"], icon: IconBath, color: "cyan" },
  { words: ["テレビ", "TV", "レコーダー"], icon: IconDeviceTv, color: "grape" },
  { words: ["パソコン", "PC", "ノート"], icon: IconDeviceLaptop, color: "gray" },
  { words: ["モニター", "ディスプレイ"], icon: IconDeviceDesktop, color: "gray" },
  { words: ["プリンター", "プリンタ"], icon: IconPrinter, color: "gray" },
  { words: ["照明", "ライト", "電球"], icon: IconBulb, color: "yellow" },
  { words: ["ソファ", "家具", "椅子", "テーブル"], icon: IconSofa, color: "pink" },
  { words: ["ベッド", "マットレス", "布団"], icon: IconBed, color: "pink" },
  { words: ["車", "自転車", "カー"], icon: IconCar, color: "dark" },
];

/** 製品の一覧や見出しに出すアイコンと色。当てはまらなければ箱のアイコン。 */
export function productVisual(product: { name: string; category: string | null }): ProductVisual {
  const match = (text: string) =>
    RULES.find(({ words }) => words.some((w) => text.toUpperCase().includes(w.toUpperCase())));
  const rule =
    (product.category !== null ? match(product.category) : undefined) ?? match(product.name);
  return rule ? { icon: rule.icon, color: rule.color } : { icon: IconBox, color: "mint" };
}
