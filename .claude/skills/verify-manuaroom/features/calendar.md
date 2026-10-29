# カレンダー

メンテナンスの実施記録と今後の予定を月のカレンダーで見られる。日付を選ぶと、その日の実施と予定がカードで出る。最初から今日の欄が開いている。

## Sub-features

- `calendar-open` カレンダーを開くと、今日の欄が最初から開いている。
- `calendar-done` 今日完了したタスクが `実施` として出る。
- `calendar-due` 予定日のタスクが予定として出る (journey では未確認)。

## How to get to it (user POV)

- ナビの `カレンダー` (`/calendar`。PC 幅は左のサイドバー、スマホ幅は画面下のタブバー)。

## Driving it with drive.mjs

Preconditions:

- `scripts/doctor.sh` が `FAIL` なし。

- **今日の実施を作る。** `node .claude/skills/verify-manuaroom/scripts/drive.mjs calendar`。製品と周期 1 日のタスクを作り、製品詳細の行の `完了` を押す。`完了を記録しました` が出る。
- **カレンダーを開く。** `/calendar` を開く。`カレンダー` の見出しが出る。
- **今日の欄を見る。** 製品名を含むカードに `実施` が出る。証拠: `calendar-1-today.png` (PC 幅・スマホ幅)。
- **画面の外で確かめる。** `select kind, done_at from maintenance_logs order by rowid desc limit 3` に今日の完了が並ぶ。

## Gotchas

- 日本時間の 0 時前後 (UTC 15 時前後) は「今日」の判定がずれる。その時間帯の失敗は、まず時間帯を疑う。
- スマホ幅ではカレンダーとカードが縦に並ぶ。`fullPage` のスクリーンショットで確かめる。
- 未確認: 予定 (`calendar-due`)、月の切り替え、ほかの日付の選択。確かめるなら、タスクの追加後に翌日以降の欄を選び、製品名を含むカードを探す。
