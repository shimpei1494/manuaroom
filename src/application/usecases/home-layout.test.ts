import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../../domain/errors";
import { createFakeDeps } from "../testing/fake-deps";
import { getHomeLayout } from "./get-home-layout";
import { saveHomeLayout } from "./save-home-layout";

const LAYOUT_JSON = JSON.stringify({
  version: 1,
  rooms: [{ id: "dk", name: "DK", type: "dining", rect: [0, 0, 360, 300] }],
});

describe("間取りの保存と取得", () => {
  test("まだ登録していなければ null", async () => {
    const deps = createFakeDeps();
    expect(await getHomeLayout(deps)).toBeNull();
  });

  test("貼り付けた JSON を確かめて保存し、取得できる", async () => {
    const now = new Date("2026-11-15T00:00:00Z");
    const deps = createFakeDeps({ now, userId: "household" });

    const saved = await saveHomeLayout(deps, { layoutJson: LAYOUT_JSON });

    expect(saved).toEqual({
      userId: "household",
      layout: JSON.parse(LAYOUT_JSON) as unknown,
      updatedAt: now,
    });
    expect(await getHomeLayout(deps)).toEqual(saved);
  });

  test("保存し直すと置き換わる (1 家族 1 枚)", async () => {
    const deps = createFakeDeps();
    await saveHomeLayout(deps, { layoutJson: LAYOUT_JSON });
    const next = JSON.stringify({
      version: 1,
      rooms: [{ id: "bed", name: "寝室", type: "bedroom", rect: [0, 0, 300, 300] }],
    });

    await saveHomeLayout(deps, { layoutJson: next });

    expect((await getHomeLayout(deps))?.layout.rooms.map((r) => r.id)).toEqual(["bed"]);
  });

  test("正しくない JSON は保存せず、理由をまとめて返す", async () => {
    const deps = createFakeDeps();
    const invalid = JSON.stringify({ version: 1, rooms: [] });

    await expect(saveHomeLayout(deps, { layoutJson: invalid })).rejects.toThrow(BusinessRuleError);
    await expect(saveHomeLayout(deps, { layoutJson: invalid })).rejects.toThrow(
      "部屋を 1 つ以上書いてください",
    );
    expect(await getHomeLayout(deps)).toBeNull();
  });
});
