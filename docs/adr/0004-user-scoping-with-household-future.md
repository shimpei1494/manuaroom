# 所有スコープは MVP で User、将来 Household に移行する

すべての主要エンティティ（`products` / `manuals` / `maintenance_tasks` / `maintenance_logs` / `ai_suggestions`）は `user_id` カラムでスコープする。MVP では `local-user-1` 固定。将来の共有モデルとしては **Household（世帯）方式** を採用し、`households` / `household_members` テーブル追加 + 各テーブルへ `household_id` カラム追加というマイグレーションで対応する。

理由：家電・家具の説明書は本質的に「家」単位で共有される資源（家族間で同じエアコンの説明書を別々に管理するのは無駄）。Google Drive 型のリソース毎共有は柔軟だが、家族ユースケースには過剰。Household は仮仕様 14 章で既に方針として挙がっており、家庭利用の自然なメンタルモデルと一致する。

## 移行時に閉じ込める変更範囲

- インフラ層のリポジトリ WHERE 句 `userId` → `householdId`
- `AuthPort.requireUserId()` を `requireHouseholdId()` のような関数に拡張
- URL 構造（`/products/$productId/manuals/$manualId` 等）は**変更しない**
- ドメイン層・ユースケース層・コンポーネントは原則変更不要

## 不採用案

- **個人スコープのまま共有なし**: 家族で重複登録が必要になり目的に反する
- **リソース毎共有（Google Drive 型）**: 家族間で全部を共有するのが基本なので、毎回共有設定するのは無駄。家族 = 全部共有という強い前提が成り立つので Household モデルで十分
