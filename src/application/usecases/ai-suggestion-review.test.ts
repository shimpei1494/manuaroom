import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeAiSuggestion } from "../testing/fake-deps";
import { acceptAiSuggestion } from "./accept-ai-suggestion";
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
