import { describe, expect, test } from "vite-plus/test";

import {
  dateValueToDate,
  formatWarrantyPeriod,
  jstDateValue,
  warrantyUntilValue,
} from "./warranty-presets";

describe("formatWarrantyPeriod", () => {
  test("12 の倍数は年、それ以外はか月で表す", () => {
    expect(formatWarrantyPeriod(6)).toBe("6か月");
    expect(formatWarrantyPeriod(12)).toBe("1年");
    expect(formatWarrantyPeriod(120)).toBe("10年");
    expect(formatWarrantyPeriod(18)).toBe("18か月");
  });
});

describe("dateValueToDate", () => {
  test("DateInput の文字列も Date もそのまま日付として読む", () => {
    expect(dateValueToDate("2026-01-10")).toEqual(new Date(2026, 0, 10));
    const date = new Date(2026, 0, 10);
    expect(dateValueToDate(date)).toEqual(date);
  });

  test("空なら null", () => {
    expect(dateValueToDate(null)).toBeNull();
    expect(dateValueToDate(undefined)).toBeNull();
    expect(dateValueToDate("")).toBeNull();
  });
});

describe("warrantyUntilValue", () => {
  test("購入日 + 期間を DateInput と同じ形式で返す", () => {
    expect(warrantyUntilValue("2026-01-10", 12)).toBe("2027-01-10");
    expect(warrantyUntilValue(new Date(2026, 0, 10), 6)).toBe("2026-07-10");
  });

  test("購入日がなければ null", () => {
    expect(warrantyUntilValue(null, 12)).toBeNull();
  });
});

describe("jstDateValue", () => {
  test("日本時間の日付を YYYY-MM-DD で返す", () => {
    expect(jstDateValue(new Date("2026-11-14T03:00:00Z"))).toBe("2026-11-14");
  });

  test("UTC ではまだ前日でも、日本時間で日付が変わっていれば翌日になる", () => {
    expect(jstDateValue(new Date("2026-11-14T15:00:00Z"))).toBe("2026-11-15");
    expect(jstDateValue(new Date("2026-12-31T15:30:00Z"))).toBe("2027-01-01");
  });
});
