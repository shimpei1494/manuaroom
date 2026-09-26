# テストの書き方

どの層を、どこまで、どう試すかの約束。背景は [ADR 0007](adr/0007-layered-structure-and-testing-policy.md)。

## 実行

```bash
vp test          # 全テスト
vp test src/domain   # パスで絞り込み
vp check         # フォーマット・lint・型チェック
```

PR では GitHub Actions（`voidzero-dev/setup-vp`）が `vp check` と `vp test` を実行する。両方通ってからマージする。

## 層ごとの方針

| 層                            | テストするもの                                                    | やり方                                                                       | 必須度         |
| ----------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| `domain`                      | 日付・周期の計算、完了・スキップ、期限の分類などすべてのルール    | 純粋関数の単体テスト                                                         | 必須           |
| `application/usecases`        | 分岐や状態遷移を持つもの（完了、AI 提案の採用、解析の失敗時など） | フェイク依存 + 固定時計                                                      | 必須           |
| `infrastructure` のリポジトリ | ユーザー単位の絞り込み（他人のデータが見えないこと）、並び順      | 実 DB に対する結合テストを少数（D1 移行時に Miniflare のローカル D1 で導入） | 重要なものだけ |
| `server-functions`            | zod スキーマに独自の変換があるときだけ                            | スキーマ単体                                                                 | 基本不要       |
| 画面                          | 表示整形ヘルパーは単体テスト。操作は主要フロー 3〜4 本だけ E2E    | E2E は Cloudflare 移行後に Playwright で導入                                 | 後回し         |

新しいルールやユースケースは、先にテストを書いてから実装する（domain → usecase の順）。

## 置き場所と名前

- テストは対象と同じディレクトリに `<対象>.test.ts` で置く。
- テスト名は日本語で「条件 → 結果」がわかるように書く。ADR に根拠があるケースは名前に ADR 番号を入れる。
- import は `vite-plus/test` から（`vitest` を直接使わない）。

## ユースケースのテスト

`src/application/testing/fake-deps.ts` の `createFakeDeps()` を使う。リポジトリとストレージはメモリ上の実装、認証は固定ユーザー、時計は固定時刻、AI はスタブになっている。

```ts
import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { markMaintenanceDone } from "./mark-maintenance-done";

test("完了日 + 周期で次回予定日を立て直す（ADR 0001）", async () => {
  const deps = createFakeDeps({ now: new Date("2026-01-10T00:00:00Z") });
  const task = makeMaintenanceTask({ intervalValue: 2, intervalUnit: "week" });
  await deps.maintenanceTaskRepository.create(task);

  const { task: updated } = await markMaintenanceDone(deps, { taskId: task.id });

  expect(updated.nextDueDate).toEqual(new Date("2026-01-24T00:00:00Z"));
});
```

- 結果は戻り値と、フェイクリポジトリに保存された中身の両方で確かめる。
- 時刻は `createFakeDeps({ now })` で固定する。テスト内で `new Date()`（引数なし）を使わない。
- 「他のユーザーのデータは見つからない」ケースは `userId` を変えたデータを入れて確かめる。
- フェイクは ports の型を満たすように書く。ports を変えたら型エラーでフェイクの更新漏れがわかる。

## やらないこと

- 実装の内部（どの関数が何回呼ばれたか）をモックで検証すること。結果（戻り値と保存された状態）で確かめる。
- 外部 API（OpenAI など）をテストから呼ぶこと。`AiServicePort` をスタブにする。
- テストを通すために `skip` / `only` を残したままコミットすること。
