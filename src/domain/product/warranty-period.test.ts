import { describe, expect, test } from "vite-plus/test";

import { findWarrantyPeriod, warrantyUntilFromPurchase } from "./warranty-period";

describe("warrantyUntilFromPurchase", () => {
  test("購入日に保証期間 (か月) を足した日を保証期限にする", () => {
    expect(warrantyUntilFromPurchase(new Date(2026, 0, 10), 12)).toEqual(new Date(2027, 0, 10));
    expect(warrantyUntilFromPurchase(new Date(2026, 0, 10), 6)).toEqual(new Date(2026, 6, 10));
    expect(warrantyUntilFromPurchase(new Date(2026, 0, 10), 60)).toEqual(new Date(2031, 0, 10));
  });

  test("その月に同じ日がなければ月末にそろえる", () => {
    expect(warrantyUntilFromPurchase(new Date(2028, 1, 29), 12)).toEqual(new Date(2029, 1, 28));
    expect(warrantyUntilFromPurchase(new Date(2026, 7, 31), 6)).toEqual(new Date(2027, 1, 28));
  });

  test("期間が 1 以上の整数でなければエラーにする", () => {
    expect(() => warrantyUntilFromPurchase(new Date(2026, 0, 10), 0)).toThrow();
    expect(() => warrantyUntilFromPurchase(new Date(2026, 0, 10), 1.5)).toThrow();
  });
});

describe("findWarrantyPeriod", () => {
  const periods = [6, 12, 24] as const;

  test("保証期限が購入日 + 候補の期間と同じ日なら、その期間を返す", () => {
    expect(findWarrantyPeriod(new Date(2026, 0, 10), new Date(2027, 0, 10), periods)).toBe(12);
  });

  test("時刻が違っても日付が同じなら一致とみなす", () => {
    expect(
      findWarrantyPeriod(new Date(2026, 0, 10, 0, 0), new Date(2028, 0, 10, 9, 30), periods),
    ).toBe(24);
  });

  test("どの候補とも合わなければ null", () => {
    expect(findWarrantyPeriod(new Date(2026, 0, 10), new Date(2027, 0, 9), periods)).toBeNull();
  });

  test("購入日か保証期限がなければ null", () => {
    expect(findWarrantyPeriod(null, new Date(2027, 0, 10), periods)).toBeNull();
    expect(findWarrantyPeriod(new Date(2026, 0, 10), null, periods)).toBeNull();
  });
});
