# Manuaroom

家電・家具・住宅設備の説明書PDFを管理し、メンテナンス周期を追跡する個人向けアプリ。説明書PDFをAIで「使えるメンテナンス台帳」に変えることを差別化価値とする。

## Language

### 中核エンティティ

**Product（製品）**:
ユーザーが所有する家電・家具・住宅設備など、説明書を持つ物理的なモノ。1つのProductは0個以上のManualを持つ。
_Avoid_: アイテム、家財、機器

**Manual（説明書）**:
ある Product に紐づく説明書PDFファイル。1つのProductに対して複数のManualを持てる（例: 取扱説明書 + 据付説明書）。
_Avoid_: マニュアル、ドキュメント、PDF（ファイル実体を指すとき以外）

**Maintenance Task（メンテナンスタスク）**:
ある Product に対して周期的に実施すべき作業の定義。次回予定日と最終実施日を持つ。「フィルター清掃 / 2週間ごと」のような単位。先取りで未来の予定を積まない — 完了時に初めて次の予定が立つ。
_Avoid_: タスク、ジョブ、チェック項目

**Maintenance Log（メンテナンス実施記録）**:
Maintenance Task を1回完了したという事実の記録。完了するたびに1レコード追加され、履歴として残る。Task 側の `last_done_at` は logs の最新値をキャッシュする非正規化カラム。
_Avoid_: 履歴、ログエントリ

**期限超過（Overdue）**:
Maintenance Task の `next_due_date` が現在日より過去になっている状態。完了するまでこの状態が続き、未来の予定は前倒しで生成されない。
_Avoid_: 期限切れ、遅延

**AI Suggestion（AI候補）**:
Manual を AI で解析して得られた「候補」データ。`pending` → ユーザーが `accepted` / `rejected` を選択する。承認されると別エンティティ（Maintenance Task など）として正式登録される。AI Suggestion 自身は「候補の記録」であり、ユーザーが保存している正式データではない。
_Avoid_: 提案、レコメンド、AI結果

### AI解析の語彙

**AI解析（AI Analysis）**:
ユーザーが「AIで解析」ボタンを押した時のみ実行される、Manual PDF を OpenAI API に渡して候補を抽出する処理。自動実行はしない。
_Avoid_: AI処理、自動抽出

**承認（Accept）/ 却下（Reject）**:
AI Suggestion に対するユーザーの判断。承認すると正式な Maintenance Task などに昇格する。却下するとそのまま残るが利用されない。
_Avoid_: 確定、保留

### ユーザー

**User（ユーザー）**:
アプリの利用者。MVP では `local-user-1` 固定。すべての主要エンティティに `user_id` が紐づく。将来 Better Auth + Google OAuth に置き換える。
_Avoid_: アカウント、オーナー

**Household（世帯）** — _未実装、将来導入予定_:
1人以上の User が所属する共有グループ。導入後は Product / Manual / Maintenance Task などの所有者は User ではなく Household になる。家族で家電管理を共有するユースケースに対応するためのモデル。MVP では存在しないが、データモデルは将来 `household_id` を追加できる前提で設計する（参照: ADR）。
_Avoid_: 家族、ファミリー、ワークスペース

## Flagged ambiguities

**「消耗品（Consumable）」の扱い** — まだ仕様未確定。MVP では AI Suggestion のサブタイプとして扱う想定だが、独立した Consumable エンティティとして昇格させるかは未決定。

## Example dialogue

> A: 「ダイキンのエアコン買ったから登録したい」
> B: 「Product として登録するんですね。説明書PDFは持ってますか？ あれば Manual として紐付けます」
> A: 「取扱説明書と据付説明書、2つあるけど両方入れていい？」
> B: 「同じ Product に2つ Manual を紐付けられます。アップロード後に『AIで解析』を押すと AI Suggestion として候補が出ます」
> A: 「フィルター掃除を2週間ごとにやるって書いてあったわ」
> B: 「それは Maintenance Task ですね。AI Suggestion から承認すれば正式な Maintenance Task になります」
