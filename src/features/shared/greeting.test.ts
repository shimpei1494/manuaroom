import { describe, expect, test } from "vite-plus/test";

import { greeting } from "./greeting";

describe("greeting", () => {
  test.each([
    [4, "おはようございます"],
    [10, "おはようございます"],
    [11, "こんにちは"],
    [17, "こんにちは"],
    [18, "こんばんは"],
    [3, "こんばんは"],
  ])("%i 時は「%s」", (hour, expected) => {
    expect(greeting(new Date(2026, 9, 27, hour, 30))).toBe(expected);
  });
});
