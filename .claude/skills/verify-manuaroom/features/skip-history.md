# スキップと履歴

今回は見送ると決めたタスクをスキップできる。スキップすると次の周期に進み、記録が残る (ADR 0006)。スキップした回数が表に出て、履歴の画面から取り消せる。

## Sub-features

- `skip-do` 確認ダイアログを経てスキップする。
- `skip-count` 表に `N回スキップ中` が出る。
- `history-open` タスクの履歴 (完了・スキップの記録) を開く。
- `history-undo` 履歴からスキップを取り消す。

## How to get to it (user POV)

- 製品詳細 (`/products/<id>`) のタスク表の行にある `スキップ` と `履歴`。
- `今やること` (`/`) のカードと `メンテナンス` (`/maintenance`) の一覧にも `スキップ` がある。

## Driving it with drive.mjs

Preconditions:

- `scripts/doctor.sh` が `FAIL` なし。

- **スキップする。** `node .claude/skills/verify-manuaroom/scripts/drive.mjs skip-history`。製品とタスク (周期 3 日) を作ってから、製品詳細の行の `スキップ` を押し、ダイアログの `スキップする` を押す。行に `1回スキップ中` が出る。証拠: `skip-1-skipped.png`。
- **履歴を開く。** 行の `履歴` を押す。`履歴` を名前に持つダイアログに `スキップ` が出る。
- **取り消す。** ダイアログの `元に戻す` を押す。ダイアログに `まだ記録がありません` が出る。証拠: `skip-2-history-undone.png`。
- **画面の外で確かめる。** `select kind, done_at from maintenance_logs` (SKILL.md の `wrangler d1 execute`)。スキップのあとは `kind` がスキップの行が 1 つ増え、取り消しのあとは 0 行に戻る。

## Gotchas

- `スキップ` と `スキップする` は別のボタン (前者は行、後者は確認ダイアログ)。
- 取り消したあと、行の `スキップ中` の表示が消えるのはダイアログを閉じてから。`Escape` で閉じて確かめる。
- 未確認: スキップを取り消したあとの `next_due_date` が元に戻ること (journey は履歴の表示までしか見ない。`maintenance_tasks.next_due_date` を前後で比べる)。`/` と `/maintenance` からのスキップ。
