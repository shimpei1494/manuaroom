/* oxlint-disable react-doctor/async-parallel, react-doctor/async-await-in-loop -- 実行順序を 1 手ずつ決めるための検証用コード。並列にしない */
import type { Deps } from "../../../src/application/deps";
import { createFakeDeps, makeMaintenanceTask } from "../../../src/application/testing/fake-deps";
import { markMaintenanceDone } from "../../../src/application/usecases/mark-maintenance-done";
import { takeSnapshot, type Snapshot, type TaskState } from "./snapshot";

/** 操作が対象にする、準備で作ったタスクと記録。 */
export type Targets = { readonly taskId: string; readonly priorLogIds: readonly string[] };

export type Operation = {
  /** 反例を読む人に向けて、操作を利用者の言葉で書く。 */
  readonly name: string;
  run(deps: Deps, targets: Targets): Promise<unknown>;
};

export type Scenario = {
  readonly title: string;
  /** 操作が始まる前に、完了の記録が何件あるか (取り消しの対象になる)。 */
  readonly priorRecords: number;
  readonly operations: readonly Operation[];
};

export type ScheduleRun = {
  /** 実行した順に「どの操作が、どのリポジトリ呼び出しを実行したか」。 */
  readonly trace: readonly string[];
  /** 各分岐点で選べた数と、選んだ番号。全部の順序を数え上げるのに使う。 */
  readonly branching: readonly number[];
  readonly taken: readonly number[];
  /** 操作ごとに、時計を読んで得た時刻 (読んだ順)。 */
  readonly readings: readonly (readonly Date[])[];
  readonly snapshot: Snapshot;
  /** 準備で作ったタスクの、どの記録よりも前の状態。 */
  readonly initialTask: TaskState;
  readonly deps: Deps;
  readonly taskId: string;
};

const SETUP_TIME = new Date("2026-01-05T00:00:00Z");
const FIRST_TICK = new Date("2026-01-10T00:00:00Z").getTime();
const TICK_MS = 60_000;
const INITIAL_TASK = {
  intervalValue: 1,
  intervalUnit: "week",
  nextDueDate: new Date("2026-01-08T00:00:00Z"),
  lastDoneAt: new Date("2025-12-25T00:00:00Z"),
} as const;

type Pending = { readonly opIndex: number; readonly label: string; readonly release: () => void };

// Node のグローバル。コミット前のフックはファイルを指定して型を調べ、tsconfig の node 型が効かないので宣言しておく
declare function setImmediate(callback: () => void): unknown;

/** 微小タスクがすべて片付くまで待つ。ここでの待ちは Promise.resolve だけなので 1 回で足りる。 */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function errorLabel(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  return error.name === "BusinessRuleError" ? error.message : error.name;
}

/** 準備: タスクを作り、必要なら操作の前に完了を記録する。 */
export async function setupScenario(scenario: Scenario) {
  const deps = createFakeDeps({ now: SETUP_TIME });
  const task = makeMaintenanceTask({ ...INITIAL_TASK });
  await deps.maintenanceTaskRepository.create(task);
  const initialTask: TaskState = {
    nextDueDate: INITIAL_TASK.nextDueDate.getTime(),
    lastDoneAt: INITIAL_TASK.lastDoneAt.getTime(),
  };
  const priorLogIds: string[] = [];
  for (let i = 0; i < scenario.priorRecords; i++) {
    deps.setNow(new Date(SETUP_TIME.getTime() + (i + 1) * TICK_MS));
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });
    priorLogIds.push(log.id);
  }
  return { deps, targets: { taskId: task.id, priorLogIds }, initialTask };
}

/** 時刻を「読んだ順」に 1 分ずつ進める時計。操作ごとに何を読んだかを記録する。 */
function createTickingClock(readings: Date[][]) {
  let tick = 0;
  return (opIndex: number) => ({
    now: () => {
      tick += 1;
      const time = new Date(FIRST_TICK + tick * TICK_MS);
      readings[opIndex]?.push(time);
      return time;
    },
  });
}

/** 各リポジトリ呼び出しの直前で止まり、スケジューラが許可するまで実行しない。 */
function gateRepository<R extends object>(
  repository: R,
  repositoryName: string,
  opIndex: number,
  pending: Pending[],
): R {
  const gated: Record<string, unknown> = {};
  for (const [method, original] of Object.entries(repository)) {
    gated[method] = async (...args: unknown[]) => {
      await new Promise<void>((release) => {
        pending.push({ opIndex, label: `${repositoryName}.${method}`, release });
      });
      return (original as (...a: unknown[]) => Promise<unknown>).apply(repository, args);
    };
  }
  return gated as R;
}

/**
 * 操作を同時に走らせ、リポジトリ呼び出しの順序を choices のとおりに決めて実行する。
 * choices が尽きたあとは常に先頭を選ぶ。各分岐点の選択肢の数を branching に残す。
 */
export async function runSchedule(
  scenario: Scenario,
  choices: readonly number[],
): Promise<ScheduleRun> {
  const { deps, targets, initialTask } = await setupScenario(scenario);
  const pending: Pending[] = [];
  const readings: Date[][] = scenario.operations.map(() => []);
  const clockFor = createTickingClock(readings);
  const results: string[] = scenario.operations.map(() => "(未完了)");
  let unfinished = scenario.operations.length;

  scenario.operations.forEach((operation, opIndex) => {
    const opDeps: Deps = {
      ...deps,
      clock: clockFor(opIndex),
      maintenanceTaskRepository: gateRepository(
        deps.maintenanceTaskRepository,
        "maintenanceTaskRepository",
        opIndex,
        pending,
      ),
      maintenanceLogRepository: gateRepository(
        deps.maintenanceLogRepository,
        "maintenanceLogRepository",
        opIndex,
        pending,
      ),
      // 台帳の呼び出し 1 回は D1 の batch 1 回 (1 トランザクション) なので、途中では止めない
      maintenanceLedger: gateRepository(
        deps.maintenanceLedger,
        "maintenanceLedger",
        opIndex,
        pending,
      ),
    };
    operation
      .run(opDeps, targets)
      .then(
        () => {
          results[opIndex] = "ok";
        },
        (error: unknown) => {
          results[opIndex] = errorLabel(error);
        },
      )
      .finally(() => {
        unfinished -= 1;
      });
  });

  const trace: string[] = [];
  const branching: number[] = [];
  const taken: number[] = [];
  await settle();
  while (pending.length > 0) {
    pending.sort((a, b) => a.opIndex - b.opIndex);
    const pick = choices[taken.length] ?? 0;
    branching.push(pending.length);
    taken.push(pick);
    const [step] = pending.splice(pick, 1);
    if (!step) throw new Error("scheduler picked a missing step");
    trace.push(`${scenario.operations[step.opIndex]?.name ?? "?"}: ${step.label}`);
    step.release();
    await settle();
  }
  if (unfinished > 0) throw new Error(`${unfinished} operation(s) stuck without a pending step`);

  const snapshot = await takeSnapshot(deps, targets.taskId, results);
  return { trace, branching, taken, readings, snapshot, initialTask, deps, taskId: targets.taskId };
}

/** 比べる相手: 操作を 1 つずつ順番に実行する (同じ時刻を読ませる)。 */
export async function runSerial(
  scenario: Scenario,
  order: readonly number[],
  readings: readonly (readonly Date[])[],
): Promise<Snapshot> {
  const { deps, targets } = await setupScenario(scenario);
  const results: string[] = scenario.operations.map(() => "(未実行)");
  for (const opIndex of order) {
    const operation = scenario.operations[opIndex];
    if (!operation) continue;
    // 直列なら重ならないので 1 回で済む。やり直した操作は、確定した最後の試行の時刻を読ませる
    const confirmed = readings[opIndex]?.at(-1);
    const opDeps: Deps = {
      ...deps,
      clock: { now: () => confirmed ?? deps.clock.now() },
    };
    try {
      await operation.run(opDeps, targets);
      results[opIndex] = "ok";
    } catch (error) {
      results[opIndex] = errorLabel(error);
    }
  }
  return takeSnapshot(deps, targets.taskId, results);
}
