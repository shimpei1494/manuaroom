import { describe, expect, test } from "vite-plus/test";

import { buildWeeklyDigest } from "./weekly-digest";

// 2026-10-03 (土) 09:00 JST。UTC ではまだ 10/03 00:00
const NOW = new Date("2026-10-03T00:00:00Z");

/** 日本時間のその日の朝 8 時 (UTC では前日) を返す。日付のずれを確かめるため、あえて UTC の日付と食い違う時刻にする */
const jstMorning = (day: string) => new Date(`${day}T08:00:00+09:00`);

describe("buildWeeklyDigest", () => {
  test("期限切れと今後 7 日以内のものを、期限の近い順に日本時間の日付で並べる", () => {
    const message = buildWeeklyDigest({
      items: [
        { productName: "洗濯機", title: "槽洗浄", dueDate: jstMorning("2026-10-09") },
        { productName: "エアコン", title: "フィルター掃除", dueDate: jstMorning("2026-09-29") },
        { productName: "冷蔵庫", title: "製氷皿の掃除", dueDate: jstMorning("2026-10-03") },
        // 7 日後 (10/10) からは来週分なので出さない
        { productName: "換気扇", title: "フィルター交換", dueDate: jstMorning("2026-10-10") },
      ],
      now: NOW,
    });

    expect(message).toBe(
      [
        "今週のメンテナンス（10/3〜10/9）",
        "",
        "■ 期限切れ 1件",
        "・エアコン フィルター掃除（9/29、4日超過）",
        "",
        "■ 今週 2件",
        "・冷蔵庫 製氷皿の掃除（10/3 土）",
        "・洗濯機 槽洗浄（10/9 金）",
        "",
        "完了・スキップはアプリから記録してください。",
      ].join("\n"),
    );
  });

  test("期限切れだけ・今週だけのときは、ない方の見出しを出さない", () => {
    const message = buildWeeklyDigest({
      items: [{ productName: "洗濯機", title: "槽洗浄", dueDate: jstMorning("2026-10-05") }],
      now: NOW,
    });

    expect(message).not.toContain("期限切れ");
    expect(message).toContain("■ 今週 1件\n・洗濯機 槽洗浄（10/5 月）");
  });

  test("製品が削除されているタスクはタスク名だけ出す", () => {
    const message = buildWeeklyDigest({
      items: [{ productName: null, title: "槽洗浄", dueDate: jstMorning("2026-10-05") }],
      now: NOW,
    });

    expect(message).toContain("・槽洗浄（10/5 月）");
  });

  test("知らせるものがなければ null (送らない)", () => {
    expect(
      buildWeeklyDigest({
        items: [{ productName: "換気扇", title: "掃除", dueDate: jstMorning("2026-11-01") }],
        now: NOW,
      }),
    ).toBeNull();
    expect(buildWeeklyDigest({ items: [], now: NOW })).toBeNull();
  });
});
