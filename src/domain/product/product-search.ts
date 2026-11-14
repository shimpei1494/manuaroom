import type { Product } from "./product";

/** 部分一致検索の対象にする項目。メモは長くて思わぬ製品が引っかかるので含めない。 */
const SEARCHABLE_FIELDS = ["name", "manufacturer", "modelNumber", "category", "location"] as const;

const KATAKANA = /[ァ-ヶ]/g;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

/**
 * 検索で表記ゆれを吸収するため、全角英数・半角カナを NFKC でそろえ、
 * 英字を小文字に、カタカナをひらがなにする。
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(KATAKANA, (ch) => String.fromCharCode(ch.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET));
}

/**
 * 製品名・メーカー・型番・カテゴリ・設置場所の部分一致で絞り込む。
 * 空白で区切った語はすべてを含む製品だけを残す (AND)。検索語が空なら全件を返す。
 */
export function filterProductsByQuery<T extends Product>(
  products: readonly T[],
  query: string,
): T[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...products];
  return products.filter((product) => {
    const fields = SEARCHABLE_FIELDS.map((key) => product[key])
      .filter((value): value is string => Boolean(value))
      .map(normalizeSearchText);
    return terms.every((term) => fields.some((field) => field.includes(term)));
  });
}
