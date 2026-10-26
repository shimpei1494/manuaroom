---
name: verify-maintenance-log-races
description: Exhaustively checks that completing, skipping and undoing a maintenance task stay consistent when requests overlap (double tap, two family members). Use when changing mark-maintenance-done, skip-maintenance, undo-maintenance-log, the maintenance ledger, their repositories, or the maintenance_logs / maintenance_tasks tables.
---

# 完了・スキップ・取り消しの同時実行を確かめる

## 何を約束しているか

- **約束**: 「元に戻す」は、押した記録の直前の状態に戻す (`undoMaintenanceLog`、ADR 0006)。重なった操作も、時刻順に 1 つずつ行った結果と同じになる。
- **壊れると**: 完了を 2 回押した (連打・家族の同時操作) あと、「元に戻す」で 1 回戻すつもりが、**2 回分がまとめて消える**。予定日が意図しない日になる。
- **なぜテストが届かないか**: 通常のテストはリクエストを 1 つずつしか流さないので、「読む → 計算 → 書く」の間に別のリクエストが入る順序を試さない。
- **どう守っているか** (ADR 0009): 書くときにタスクの `updated_at` が読んだときのままかを比べ、変わっていたら読み直してやり直す。記録の追加・削除とタスクの更新は、D1 の `batch` で 1 つにまとめる (`MaintenanceLedgerPort`)。

## 使うツール

TypeScript に対応した形式検証器はなく、このリポジトリに TLC (TLA+) も入っていないので、モデルを手で書き写さず、**実コードそのもの**を全ての実行順序で動かす。

- `schedule-runner.ts`: 同時に走る操作の、リポジトリ・台帳の呼び出し 1 回 (D1 の 1 文、または `batch` 1 回に当たる不可分な単位) ごとに止め、どの順に進めるかをスケジューラが選ぶ。ユースケースとドメイン関数は本物。リポジトリと台帳だけ `createFakeDeps` のメモリ実装。
- `explore.ts`: 全ての順序を再実行で数え上げる (重複なし)。
- 各順序の結果に次の 2 つを検査する。
  - `serializable`: 操作を**時計を読んだ順に 1 つずつ**行った結果と、タスクの状態・全ての記録 (戻し先を含む)・各操作の成否が一致する。
    - 他の操作と重なってやり直した操作は、確定した最後の試行で時計を読んだ時刻で順番を決める。
    - 「見つかりません」で終わった操作は何も確定していないので、順番の制約から外す (誰が先に消したかだけが違う結果は、同じ結果とみなす)。
  - `unwinds`: 終わったあと「元に戻す」を記録がなくなるまで押すと、最初のタスクの状態に戻る。

## 実行

```bash
vp test run --config .claude/skills/verify-maintenance-log-races/vitest.config.ts
```

約 1 秒 (10 シナリオ、約 3 千通り)。通常の `vp test` には含めない (あちらは `src/**` だけを見る設定)。CI に入れるかは別に決める。

出力の読み方: 破れたシナリオごとに、(1) どの性質が、(2) 何通りの順序で破れたか、(3) そのうち 1 つの順序 (「Aが「完了」: maintenanceLedger.appendLog」の列)、(4) 実際の結果と、時刻順に 1 つずつ行った結果、が出る。**「取り消すと ... に戻る」の列が食い違う所**が本体。

## 範囲と前提

- **確かめたもの**: 2〜3 個の操作 (完了・スキップ・取り消し) が重なる全順序。タスクは 1 件、周期 1 週間、最初の予定日 2026-01-08・最終実施 2025-12-25。取り消しの対象は、準備で作った 1 件の完了記録。
- **前提**: リポジトリ呼び出し 1 回と台帳の呼び出し 1 回は不可分 (D1 の 1 文、`batch` 1 回はそうなる)。時計は読むたびに 1 分進む (本物の時計と同じく単調)。取り消しの対象は、押した時点で画面にある記録。
- **確かめていないもの**: 4 個以上の同時操作。複数のタスクの間の干渉。ほかの操作との重なり (特にタスクの編集は、完了などの結果を上書きしうる。ADR 0009)。同じミリ秒に 3 つ以上が重なる場合 (`updated_at` の分解能)。AI 解析・説明書・通知。
- **D1 の実装そのもの**はここでは動かさない (メモリ実装)。「比較に負けたら記録を足さない・消さない」は `src/infrastructure/db/repositories/maintenance-ledger.test.ts` が、ローカル D1 で確かめる。
- 合格は「このシナリオ・この範囲で破れる順序がない」であって、システム全体の保証ではない。

## 今わかっていること (確認したコミット `3aea96c`)

**全 10 シナリオが通る。** 修正前 (`721f461`〜`bbf773c` の `main`) は、対照 2 件だけが通り、同時実行の 7 件はすべて破れていた。代表例 (完了を 2 回、同時に押す) は、B の記録の戻し先が「A の完了後の状態」ではなく「最初の状態」になり、B を取り消すと A の完了ごと消えた。

検査が見逃さないことの確認 (一時的に壊して、元に戻した):

- 台帳が `updated_at` を比べないようにすると、7 件が破れる。
- 取り消しでタスクと記録を並行して読む (修正前の読み方) と、4 件が破れる。

## 変更したとき

1. 上のコマンドを実行する。
2. **全部通るのが正しい状態。** 破れたら、今回の変更が原因。反例の列を読んで直す。**性質やシナリオを弱めて通さない。**
3. 意図して変えたとき (戻し先の仕組みを変えた、操作を足したなど) は、`scenarios.ts` に操作を足し、必要なら `snapshot.ts` の見る項目を更新する。
4. 対照 2 件 (`(対照) ...`) が破れたら、重なりではなく通常の動きが壊れている。まず通常のテスト (`vp test`) を見る。
5. 検査を変えたら、台帳の比較を外すなどで一時的に壊して、検査が破れることを確かめてから戻す。

## 対応づけと同期

| 検査が見るコード                                                  | 役割                                        |
| ----------------------------------------------------------------- | ------------------------------------------- |
| `src/application/usecases/mark-maintenance-done.ts`               | 完了                                        |
| `src/application/usecases/skip-maintenance.ts`                    | スキップ                                    |
| `src/application/usecases/undo-maintenance-log.ts`                | 取り消し                                    |
| `src/application/usecases/retry-on-conflict.ts`                   | やり直し                                    |
| `src/domain/maintenance/{complete,skip,undo}-maintenance-*.ts`    | 状態の計算と戻し先                          |
| `src/application/ports/maintenance-ledger-port.ts`                | 記録とタスクを 1 つで書く単位 (止める所)    |
| `src/application/ports/maintenance-{task,log}-repository-port.ts` | 読む呼び出しの単位 (止める所)               |
| `src/application/testing/fake-deps.ts` (メモリ実装)               | リポジトリと台帳の代わり                    |
| `src/infrastructure/db/repositories/maintenance-ledger.ts`        | 本物の台帳 (ここでは動かさない。別のテスト) |

**同期コミット: `3aea96c`** (この時点で、上の対応づけが実コードを表していることを確認した)。上のファイルが、このコミットより後に変わっていたら、検査が今のコードを表しているか見直す (呼び出しの数・順序・ポート)。確認できたら、この行のコミットを進める。確認する前に進めない。
