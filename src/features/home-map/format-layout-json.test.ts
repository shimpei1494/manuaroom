import { expect, test } from "vite-plus/test";

import { formatLayoutJson } from "./format-layout-json";
import { SAMPLE_HOME_LAYOUT } from "./sample-layout";

test("座標の配列は 1 行にまとめ、元の間取りに戻せる", () => {
  const text = formatLayoutJson({
    version: 1,
    rooms: [
      {
        id: "a",
        name: "A",
        type: "other",
        polygon: [
          [0, 0],
          [10.5, 0],
          [10.5, 10],
        ],
      },
    ],
  });
  expect(text).toContain('"polygon": [\n        [0, 0],\n        [10.5, 0],');
  expect(formatLayoutJson(SAMPLE_HOME_LAYOUT)).toContain('"rect": [0, 0, 660, 100]');
  expect(JSON.parse(formatLayoutJson(SAMPLE_HOME_LAYOUT))).toEqual(SAMPLE_HOME_LAYOUT);
});
