import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeAiSuggestion, makeManual } from "../testing/fake-deps";
import { analyzeManual } from "./analyze-manual";

const payload = {
  title: "フィルター掃除",
  intervalValue: 2,
  intervalUnit: "week" as const,
  memo: null,
  sourcePage: 3,
  url: null,
};

describe("analyzeManual", () => {
  test("解析結果で提案を置き換え、状態を done にする", async () => {
    const deps = createFakeDeps({ analyzeManual: () => Promise.resolve([payload]) });
    const manual = makeManual();
    await deps.manualRepository.create(manual);
    await deps.storage.put({
      key: manual.fileKey,
      body: new ArrayBuffer(8),
      contentType: "application/pdf",
    });
    const old = makeAiSuggestion({ manualId: manual.id, status: "accepted" });
    await deps.aiSuggestionRepository.replaceByManual({
      userId: manual.userId,
      manualId: manual.id,
      suggestions: [old],
    });

    const suggestions = await analyzeManual(deps, manual.id);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ payload, status: "pending", manualId: manual.id });
    expect(
      await deps.aiSuggestionRepository.listByManual({
        userId: manual.userId,
        manualId: manual.id,
      }),
    ).toEqual(suggestions);
    const saved = await deps.manualRepository.findById({
      userId: manual.userId,
      manualId: manual.id,
    });
    expect(saved?.aiStatus).toBe("done");
  });

  test("AI が失敗したら状態を error にして例外を返す", async () => {
    const deps = createFakeDeps({ analyzeManual: () => Promise.reject(new Error("quota")) });
    const manual = makeManual();
    await deps.manualRepository.create(manual);
    await deps.storage.put({
      key: manual.fileKey,
      body: new ArrayBuffer(8),
      contentType: "application/pdf",
    });

    await expect(analyzeManual(deps, manual.id)).rejects.toThrow("quota");

    const saved = await deps.manualRepository.findById({
      userId: manual.userId,
      manualId: manual.id,
    });
    expect(saved?.aiStatus).toBe("error");
  });

  test("PDF がストレージになければ状態を error にする", async () => {
    const deps = createFakeDeps({ analyzeManual: () => Promise.resolve([payload]) });
    const manual = makeManual();
    await deps.manualRepository.create(manual);

    await expect(analyzeManual(deps, manual.id)).rejects.toThrow(/missing from storage/);

    const saved = await deps.manualRepository.findById({
      userId: manual.userId,
      manualId: manual.id,
    });
    expect(saved?.aiStatus).toBe("error");
  });
});
