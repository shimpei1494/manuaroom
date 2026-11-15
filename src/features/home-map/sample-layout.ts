import type { HomeLayout } from "../../domain/home-map/home-layout";

/**
 * 架空の 2DK の間取り。設定画面の「サンプルを入れる」と、テスト・E2E で使う。
 * 本物の間取りは git に入れず、画面から D1 に保存する (docs/home-map.md)。
 */
export const SAMPLE_HOME_LAYOUT: HomeLayout = {
  version: 1,
  name: "サンプルの 2DK",
  rooms: [
    { id: "balcony", name: "バルコニー", type: "balcony", rect: [0, 0, 660, 100] },
    { id: "bedroom", name: "洋室", type: "bedroom", rect: [0, 100, 330, 330] },
    { id: "washitsu", name: "和室", type: "japanese", rect: [330, 100, 330, 330] },
    { id: "dk", name: "DK", type: "dining", rect: [0, 430, 430, 300] },
    { id: "washroom", name: "洗面所", type: "washroom", rect: [430, 430, 120, 150] },
    { id: "bath", name: "浴室", type: "bath", rect: [550, 430, 110, 150] },
    { id: "entrance", name: "玄関", type: "entrance", rect: [430, 580, 140, 150] },
    { id: "toilet", name: "トイレ", type: "toilet", rect: [570, 580, 90, 150] },
  ],
  doors: [
    { wall: [450, 730, 530, 730], opensInto: "outside" },
    { wall: [430, 610, 430, 690], hinge: "end", opensInto: "dk" },
    { wall: [430, 455, 430, 535], kind: "sliding" },
    { wall: [550, 455, 550, 535], opensInto: "bath" },
    { wall: [570, 610, 570, 690], opensInto: "entrance" },
    { wall: [240, 430, 320, 430], kind: "sliding" },
    { wall: [340, 430, 420, 430], kind: "sliding" },
  ],
  windows: [
    { wall: [40, 100, 290, 100] },
    { wall: [370, 100, 620, 100] },
    { wall: [0, 200, 0, 330] },
    { wall: [0, 500, 0, 650] },
  ],
};
