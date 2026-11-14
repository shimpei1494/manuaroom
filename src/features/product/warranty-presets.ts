import type { DateValue } from "@mantine/dates";
import dayjs from "dayjs";

import { warrantyUntilFromPurchase } from "../../domain/product/warranty-period";

/** 保証期限の入力欄に出す期間の候補 (か月)。家電でよくある長さだけ並べる。 */
export const WARRANTY_PERIOD_PRESETS = [6, 12, 24, 36, 60, 120] as const;

/** 12 の倍数は「年」、それ以外は「か月」で表す。 */
export function formatWarrantyPeriod(months: number): string {
  return months % 12 === 0 ? `${(months / 12).toString()}年` : `${months.toString()}か月`;
}

/** DateInput の値 ("YYYY-MM-DD" か Date) を Date にする。 */
export function dateValueToDate(value: DateValue | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : null;
}

/** 購入日 + 期間の保証期限を、DateInput が返すのと同じ "YYYY-MM-DD" で返す。 */
export function warrantyUntilValue(purchaseDate: DateValue, months: number): string | null {
  const purchase = dateValueToDate(purchaseDate);
  if (purchase === null) return null;
  return dayjs(warrantyUntilFromPurchase(purchase, months)).format("YYYY-MM-DD");
}
