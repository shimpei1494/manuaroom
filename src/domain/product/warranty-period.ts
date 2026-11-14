import dayjs from "dayjs";

/**
 * 購入日から保証期間 (か月) が過ぎる日を保証期限とする。
 * 「1 年保証」で 2026/01/10 に買ったなら 2027/01/10。
 * その月に同じ日がない場合 (2/29 や 8/31 など) は月末にそろえる。
 */
export function warrantyUntilFromPurchase(purchaseDate: Date, months: number): Date {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error(`months must be a positive integer, got ${String(months)}`);
  }
  return dayjs(purchaseDate).add(months, "month").toDate();
}

/**
 * 保証期限が「購入日 + 候補の期間」のどれかと同じ日なら、その期間 (か月) を返す。
 * 時刻は見ずに日付だけを比べる。
 */
export function findWarrantyPeriod(
  purchaseDate: Date | null,
  warrantyUntil: Date | null,
  periods: readonly number[],
): number | null {
  if (purchaseDate === null || warrantyUntil === null) return null;
  const until = dayjs(warrantyUntil);
  return (
    periods.find((months) =>
      dayjs(warrantyUntilFromPurchase(purchaseDate, months)).isSame(until, "day"),
    ) ?? null
  );
}
