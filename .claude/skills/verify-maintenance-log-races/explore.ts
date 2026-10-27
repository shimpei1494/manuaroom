/* oxlint-disable react-doctor/async-parallel, react-doctor/async-await-in-loop -- 実行を 1 通りずつ順番に試す検証用コード。並列にしない */
import { runSchedule, runSerial, type Scenario, type ScheduleRun } from "./schedule-runner";
import { unwindAllLogs, type Snapshot, type TaskState } from "./snapshot";

export type PropertyName = "serializable" | "unwinds";

export type Counterexample = {
  readonly trace: readonly string[];
  readonly actual: Snapshot;
  /** serializable が破れたときの、いちばん近い直列実行の結果。 */
  readonly expected?: Snapshot;
  /** unwinds が破れたときの、元に戻したあとの状態か理由。 */
  readonly unwound?: string;
};

export type Violation = {
  readonly property: PropertyName;
  /** 破れた実行順序の数。 */
  readonly count: number;
  readonly example: Counterexample;
};

export type ExploreReport = {
  readonly title: string;
  /** 数え上げた実行順序の数。 */
  readonly schedules: number;
  readonly violations: readonly Violation[];
};

function permutations(size: number): number[][] {
  if (size === 0) return [[]];
  return permutations(size - 1).flatMap((rest) =>
    Array.from({ length: rest.length + 1 }, (_, at) => [
      ...rest.slice(0, at),
      size - 1,
      ...rest.slice(at),
    ]),
  );
}

/**
 * 時計を読んだ順 (= 時刻の順) を守る直列実行の順番だけを、比べる相手にする。
 * 他の操作と重なってやり直した操作は、確定した最後の試行で時計を読んだ時刻で順番を決める (ADR 0009)。
 * ただし「見つかりません」で終わった操作は何も確定していない。残っている時刻は最初の試行のもので、
 * 順番を決める根拠にならないので、順番の制約から外す (どの順で行っても「見つからない」で終わるかは、
 * 結果の比較で見る)。
 */
function consistentOrders(run: ScheduleRun): number[][] {
  const lastReading = run.readings.map((times, i) =>
    run.snapshot.results[i] === "NotFoundError" ? null : (times.at(-1)?.getTime() ?? null),
  );
  return permutations(run.readings.length).filter((order) => {
    const position = new Map(order.map((opIndex, at) => [opIndex, at]));
    return lastReading.every((a, i) =>
      lastReading.every((b, j) => {
        if (a === null || b === null || a >= b) return true;
        return (position.get(i) ?? 0) < (position.get(j) ?? 0);
      }),
    );
  });
}

function sameTask(a: TaskState, b: TaskState): boolean {
  return a.nextDueDate === b.nextDueDate && a.lastDoneAt === b.lastDoneAt;
}

async function serialOutcomes(
  scenario: Scenario,
  run: ScheduleRun,
  cache: Map<string, readonly Snapshot[]>,
): Promise<readonly Snapshot[]> {
  const key = JSON.stringify(run.readings.map((times) => times.map((t) => t.getTime())));
  const cached = cache.get(key);
  if (cached) return cached;
  const outcomes: Snapshot[] = [];
  for (const order of consistentOrders(run)) {
    outcomes.push(await runSerial(scenario, order, run.readings));
  }
  cache.set(key, outcomes);
  return outcomes;
}

async function checkRun(
  scenario: Scenario,
  run: ScheduleRun,
  cache: Map<string, readonly Snapshot[]>,
): Promise<Map<PropertyName, Counterexample>> {
  const failures = new Map<PropertyName, Counterexample>();

  const serial = await serialOutcomes(scenario, run, cache);
  const actualKey = JSON.stringify(run.snapshot);
  if (!serial.some((outcome) => JSON.stringify(outcome) === actualKey)) {
    failures.set("serializable", { trace: run.trace, actual: run.snapshot, expected: serial[0] });
  }

  const unwound = await unwindAllLogs(run.deps, run.taskId);
  if (!unwound.ok) {
    failures.set("unwinds", { trace: run.trace, actual: run.snapshot, unwound: unwound.reason });
  } else if (!sameTask(unwound.task, run.initialTask)) {
    failures.set("unwinds", {
      trace: run.trace,
      actual: run.snapshot,
      unwound: JSON.stringify({ expected: run.initialTask, got: unwound.task }),
    });
  }
  return failures;
}

/** 操作が同時に走るときの、リポジトリ呼び出しの全ての順序を数え上げて、性質が破れる順序を集める。 */
export async function exploreScenario(scenario: Scenario): Promise<ExploreReport> {
  const prefixes: number[][] = [[]];
  const cache = new Map<string, readonly Snapshot[]>();
  const counts = new Map<PropertyName, { count: number; example: Counterexample }>();
  let schedules = 0;

  for (let prefix = prefixes.pop(); prefix; prefix = prefixes.pop()) {
    const run = await runSchedule(scenario, prefix);
    schedules += 1;
    for (let depth = prefix.length; depth < run.branching.length; depth++) {
      for (let choice = 1; choice < (run.branching[depth] ?? 1); choice++) {
        prefixes.push([...run.taken.slice(0, depth), choice]);
      }
    }
    for (const [property, example] of await checkRun(scenario, run, cache)) {
      const seen = counts.get(property);
      counts.set(property, { count: (seen?.count ?? 0) + 1, example: seen?.example ?? example });
    }
  }

  const violations = [...counts].map(([property, { count, example }]) => ({
    property,
    count,
    example,
  }));
  return { title: scenario.title, schedules, violations };
}
