import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeAiSuggestion } from "../testing/fake-deps";
import { acceptAiSuggestion } from "./accept-ai-suggestion";
import { acceptAllAiSuggestions } from "./accept-all-ai-suggestions";
import { rejectAiSuggestion } from "./reject-ai-suggestion";

describe("acceptAiSuggestion", () => {
  test("提案をタスクにし、今日 + 周期を予定日にして出典を残す", async () => {
    const deps = createFakeDeps({ now: new Date("2026-04-01T00:00:00Z") });
    const suggestion = makeAiSuggestion();
    await deps.aiSuggestionRepository.replaceByManual({
      userId: suggestion.userId,
      manualId: suggestion.manualId,
      suggestions: [suggestion],
    });

    const task = await acceptAiSuggestion(deps, suggestion.id);

    expect(task.nextDueDate).toEqual(new Date("2026-04-15T00:00:00Z"));
    expect(task).toMatchObject({
      title: suggestion.payload.title,
      source: "ai",
      sourceManualId: suggestion.manualId,
      sourcePage: 12,
      lastDoneAt: null,
    });
    const saved = await deps.aiSuggestionRepository.findById({
      userId: suggestion.userId,
      suggestionId: suggestion.id,
    });
    expect(saved?.status).toBe("accepted");
  });

  test("判断済みの提案は採用できない", async () => {
    const deps = createFakeDeps();
    const suggestion = makeAiSuggestion({ status: "rejected" });
    await deps.aiSuggestionRepository.replaceByManual({
      userId: suggestion.userId,
      manualId: suggestion.manualId,
      suggestions: [suggestion],
    });

    await expect(acceptAiSuggestion(deps, suggestion.id)).rejects.toThrow(/not pending/);
    expect(await deps.maintenanceTaskRepository.listByUser(suggestion.userId)).toEqual([]);
  });

  test("存在しない提案は NotFoundError", async () => {
    const deps = createFakeDeps();

    await expect(acceptAiSuggestion(deps, "missing")).rejects.toThrow(NotFoundError);
  });
});

describe("acceptAllAiSuggestions", () => {
  test("説明書の未判断の候補を全部タスクにし、判断済みの候補と他の説明書には触らない", async () => {
    const deps = createFakeDeps({ now: new Date("2026-04-01T00:00:00Z") });
    const pendings = [
      makeAiSuggestion({ payload: { ...makeAiSuggestion().payload, title: "A" } }),
      makeAiSuggestion({ payload: { ...makeAiSuggestion().payload, title: "B" } }),
    ];
    const rejected = makeAiSuggestion({ status: "rejected" });
    const accepted = makeAiSuggestion({ status: "accepted" });
    const base = { userId: rejected.userId, manualId: rejected.manualId };
    await deps.aiSuggestionRepository.replaceByManual({
      ...base,
      suggestions: [...pendings, rejected, accepted],
    });
    const otherManual = makeAiSuggestion({ manualId: "manual-2" });
    await deps.aiSuggestionRepository.replaceByManual({
      userId: otherManual.userId,
      manualId: otherManual.manualId,
      suggestions: [otherManual],
    });

    const tasks = await acceptAllAiSuggestions(deps, base.manualId);

    expect(tasks.map((t) => t.title)).toEqual(["A", "B"]);
    expect(tasks.every((t) => t.source === "ai" && t.sourceManualId === base.manualId)).toBe(true);
    expect(await deps.maintenanceTaskRepository.listByUser(base.userId)).toHaveLength(2);
    const statuses = (await deps.aiSuggestionRepository.listByManual(base)).map((s) => s.status);
    expect(statuses).toEqual(["accepted", "accepted", "rejected", "accepted"]);
    const other = await deps.aiSuggestionRepository.findById({
      userId: otherManual.userId,
      suggestionId: otherManual.id,
    });
    expect(other?.status).toBe("pending");
  });

  test("未判断の候補がなければ何も作らない", async () => {
    const deps = createFakeDeps();
    const suggestion = makeAiSuggestion({ status: "rejected" });
    await deps.aiSuggestionRepository.replaceByManual({
      userId: suggestion.userId,
      manualId: suggestion.manualId,
      suggestions: [suggestion],
    });

    expect(await acceptAllAiSuggestions(deps, suggestion.manualId)).toEqual([]);
    expect(await deps.maintenanceTaskRepository.listByUser(suggestion.userId)).toEqual([]);
  });

  test("一括承認のあとに個別の承認ボタンが押されても、タスクは重複しない", async () => {
    const deps = createFakeDeps();
    const suggestion = makeAiSuggestion();
    await deps.aiSuggestionRepository.replaceByManual({
      userId: suggestion.userId,
      manualId: suggestion.manualId,
      suggestions: [suggestion],
    });

    await acceptAllAiSuggestions(deps, suggestion.manualId);

    await expect(acceptAiSuggestion(deps, suggestion.id)).rejects.toThrow(/not pending/);
    expect(await deps.maintenanceTaskRepository.listByUser(suggestion.userId)).toHaveLength(1);
  });
});

describe("rejectAiSuggestion", () => {
  test("提案を却下済みにし、タスクは作らない", async () => {
    const deps = createFakeDeps();
    const suggestion = makeAiSuggestion();
    await deps.aiSuggestionRepository.replaceByManual({
      userId: suggestion.userId,
      manualId: suggestion.manualId,
      suggestions: [suggestion],
    });

    await rejectAiSuggestion(deps, suggestion.id);

    const saved = await deps.aiSuggestionRepository.findById({
      userId: suggestion.userId,
      suggestionId: suggestion.id,
    });
    expect(saved?.status).toBe("rejected");
    expect(await deps.maintenanceTaskRepository.listByUser(suggestion.userId)).toEqual([]);
  });
});
