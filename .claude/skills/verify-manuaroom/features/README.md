# Manuaroom verification map

利用者が触る機能ごとの確かめ方を置く。操作の前にこの README を読み、該当する機能のファイルをレシピとして使う。

## Baseline preconditions

- `scripts/launch.sh` で起動した検証インスタンス (`http://localhost:3101`) だけを操作する。D1・R2 は空から始まり、モック OpenAI が 4010 で動いている。
- 操作の前に `scripts/doctor.sh` が `FAIL` なしで終わること。
- ユーザーは固定の `local-user-1` (ログインなし)。ログイン画面は無い。
- 各 journey は、名前に乱数を付けた製品を自分で作る。同じ DB を使い回しても互いに影響しない。

## Driving conventions

- ARIA ロールと画面の文言で探す。座標・タブ順・CSS の位置は使わない。
- 画面の文言は日本語のまま扱う。`完了` と `完了を記録しました` のように、似た文言は完全一致か範囲を絞って指定する。
- 「削除」「完了」のようにページ内に複数あるボタンは、行 (`row`) かカード (`.mantine-Card-root`) の中に絞る。
- 通知 (トースト) は数秒で消える。操作の直後に確かめる。
- 検証後は `scripts/cleanup.sh`。証拠は消さない。

## Proof and skip reporting

- 操作の途中と最後のスクリーンショットを撮る。PC 幅とスマホ幅の両方。
- 変更を伴う操作は、`wrangler d1 execute` で保存された値も別の見方で確かめる (SKILL.md の Evidence)。
- 機能 ID (`tasks-complete` など) と、使った入口を証拠に添える。
- 届かなかった入口は、試したコマンドと足りなかった前提を報告する。別の入口で通ったことにしない。
- journey が確かめていない項目は、各機能の `Gotchas` に `未確認` と書いてある。確かめずに「検証した」と言わない。

## Feature entry contract

各機能ファイルは H1 と、利用者から見た挙動の説明 1 段落で始まり、次の 4 つの H2 をこの順で持つ。

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with drive.mjs`
4. `Gotchas`

## Features

- [メンテナンスタスク](./maintenance-tasks.md): 製品登録、タスク追加、今やることからの完了と取り消し。
- [スキップと履歴](./skip-history.md): スキップ、スキップ回数の表示、履歴からの取り消し。
- [カレンダー](./calendar.md): 実施記録と予定を日ごとに見る。
- [説明書と AI](./manual-ai.md): PDF アップロード、AI 解析と候補の承認・却下、説明書への質問、削除。
- [説明書 PDF から製品を登録](./product-from-manual.md): 新規登録画面で PDF を選ぶと、AI が読み取った内容で製品と説明書が作られる。
