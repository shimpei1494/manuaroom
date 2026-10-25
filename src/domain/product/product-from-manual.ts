/** 説明書 PDF から AI が読み取った製品情報。読み取れなかった項目は null。 */
export type ManualProductInfo = {
  name: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  category: string | null;
};

export type ProductFieldsFromManual = {
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  category: string | null;
};

const FALLBACK_PRODUCT_NAME = "名称未設定の製品";

/**
 * 読み取り結果を製品の登録内容にする。製品名は必須なので、読めなかったときは
 * メーカー + 型番 → ファイル名 → 仮の名前 の順で埋める (あとから画面で直せる)。
 */
export function productFieldsFromManualInfo(
  info: ManualProductInfo,
  fileName: string,
): ProductFieldsFromManual {
  const manufacturer = clean(info.manufacturer);
  const modelNumber = clean(info.modelNumber);
  const name =
    clean(info.name) ??
    (modelNumber ? [manufacturer, modelNumber].filter(Boolean).join(" ") : null) ??
    clean(fileName.replace(/\.pdf$/i, "")) ??
    FALLBACK_PRODUCT_NAME;
  return { name, manufacturer, modelNumber, category: clean(info.category) };
}

function clean(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}
