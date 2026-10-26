import { describe, expect, test } from "vite-plus/test";

import { exploreScenario, type ExploreReport, type Violation } from "./explore";
import { SCENARIOS } from "./scenarios";
import type { Snapshot, TaskState } from "./snapshot";

// 実行: vp test run --config .claude/skills/verify-maintenance-log-races/vitest.config.ts
// 通常の vp test には含めない (今のコードで破れる性質があるため、CI を止めない)。

const ALL_SCHEDULES_TIMEOUT_MS = 120_000;

function day(ms: number | null): string {
  return ms === null ? "なし" : new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function task(state: TaskState): string {
  return `次回予定 ${day(state.nextDueDate)} / 最終実施 ${day(state.lastDoneAt)}`;
}

function describeSnapshot(snapshot: Snapshot): string {
  const logs = snapshot.logs.map(
    (log, i) =>
      `    ${i + 1}. ${log.kind === "done" ? "完了" : "スキップ"} ${day(log.doneAt)} (取り消すと ${
        log.previous ? task(log.previous) : "戻せない"
      } に戻る)`,
  );
  return [
    `  操作の結果: ${snapshot.results.join(" / ")}`,
    `  タスク: ${task(snapshot.task)}`,
    `  記録 (古い順):`,
    ...(logs.length > 0 ? logs : ["    なし"]),
  ].join("\n");
}

const PROPERTY_SENTENCES = {
  serializable:
    "操作を時刻の順に 1 つずつ行った結果のどれかと一致しない (記録の「戻し先」が食い違う、更新が失われる)",
  unwinds: "「元に戻す」を押し続けても、最初の状態に戻らない",
} as const;

function describeViolation(violation: Violation): string {
  const { example } = violation;
  return [
    `■ ${PROPERTY_SENTENCES[violation.property]}`,
    `  該当する実行順序: ${violation.count} 通り。うち 1 つ:`,
    ...example.trace.map((step, i) => `    ${i + 1}. ${step}`),
    "  そのときの結果:",
    describeSnapshot(example.actual),
    ...(example.expected
      ? ["  時刻順に 1 つずつ行ったときの結果:", describeSnapshot(example.expected)]
      : []),
    ...(example.unwound ? [`  元に戻し続けた結果: ${example.unwound}`] : []),
  ].join("\n");
}

function describeReport(report: ExploreReport): string {
  if (report.violations.length === 0) return "";
  return [
    `${report.title} (${report.schedules} 通りを確かめた)`,
    ...report.violations.map(describeViolation),
  ].join("\n");
}

describe("完了・スキップ・取り消しが重なっても、記録の戻し先が食い違わない", () => {
  for (const scenario of SCENARIOS) {
    test(
      scenario.title,
      async () => {
        const report = await exploreScenario(scenario);
        process.stdout.write(`${scenario.title}: ${report.schedules} 通りを確かめた\n`);
        expect(describeReport(report)).toBe("");
      },
      ALL_SCHEDULES_TIMEOUT_MS,
    );
  }
});
