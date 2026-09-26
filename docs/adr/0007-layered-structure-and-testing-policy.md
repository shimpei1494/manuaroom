# レイヤーの依存は内向きに揃え、ルールはドメインの純粋関数に置いてテストする

コードは `domain` / `application` / `infrastructure` と入口層（`server-functions`、`routes`）に分け、依存は常に内側（domain 側）へ向ける。業務ルールは `domain` の純粋関数として書き、ユースケースは「取得 → ドメイン関数 → 保存」の手順だけを持つ。テストはドメイン関数とユースケースを厚く、DB・画面は薄くする。

理由：これからスキップ、ホーム画面、カレンダーと「日付と周期」を扱う機能が続き、同じ計算をあちこちに書くとすぐ食い違う。ルールを 1 か所の純粋関数に集めればテストが速く確実になる。また Cloudflare 移行（ADR 0005）で DB・ストレージ・認証の実装が丸ごと入れ替わるので、ユースケースがインフラを知らない形にしておけば、移行はインフラ層だけの変更で済み、ユースケースのテストが「挙動が変わっていないこと」の確認役になる。

## 依存の向き

```
routes（画面） ─┐
                ├─> server-functions ─> application ─> domain
routes/api    ──┘         │                  ^
                          └─> infrastructure ┘（ports を実装する）
```

| 層 | 置くもの | import してよいもの |
|---|---|---|
| `domain/` | 型、業務ルールの純粋関数、ドメインエラー | 外部の純粋ライブラリ（dayjs など）だけ |
| `application/ports/` | リポジトリ・ストレージ・AI・認証・時計のインターフェース | `domain` |
| `application/usecases/` | 1 ファイル 1 ユースケース | `domain`、`application` |
| `application/deps.ts` | ユースケースが受け取る依存の型 `Deps` | `application/ports` |
| `infrastructure/` | ports の実装、`deps.ts`（組み立て） | `domain`、`application` |
| `server-functions/`、`routes/api/` | 入力検証（zod）→ ユースケース呼び出し | `application`、`domain`、`infrastructure/deps` |
| `routes/`（画面） | ページと部品 | `server-functions`、`domain` の型 |

`domain` と `application` の禁止方向は lint（`no-restricted-imports`）で機械的に止める。

## 決めたこと

- **ユースケースは必要な依存だけを受け取る。** 引数は `Pick<Deps, "auth" | "maintenanceTaskRepository" | ...>` にし、何に依存しているかをシグネチャで読めるようにする。テストでも必要なフェイクだけ渡せばよい。
- **現在時刻は `ClockPort` から取る。** ユースケースで `new Date()` を直接呼ばない。「今日」に依存するルール（期限切れ判定、スキップ）をテストで固定できるようにするため。
- **業務ルールはドメイン関数にする。** 例：完了処理 `completeMaintenanceTask(task, doneAt, now)` は次回予定日の再計算まで含めて新しいタスクを返す。スキップ（ADR 0006）も同じ形で `skipMaintenanceTask` を足す。
- **「見つからない」は `NotFoundError`。** 素の `Error` と区別し、入口層で HTTP 404 やメッセージに変換できるようにする。
- **組み立ては `infrastructure/deps.ts` の 1 か所。** Cloudflare 移行時にリクエストごとの `env` から作る `createDeps(env)` 形式に変える。
- **画面は `routes/` にページの組み立てだけを置く。** 複数ページで使う部品や表示整形は `src/features/<機能>/` や `src/lib/` に切り出す。1 ファイル 300 行程度を分割の目安にし、既存の大きいファイルは触るタイミングで少しずつ割る。

テストの書き方は `docs/testing.md` にまとめる。

## 不採用案

- **ユースケースを class にして DI コンテナを使う**: 個人アプリの規模では仕組みの重さに見合わない。関数 + 依存オブジェクトで十分に差し替えられる。
- **ルールをエンティティの class メソッドにする**: Drizzle の行や server function の戻り値とプレーンなオブジェクトのまま行き来できる利点を失う。型 + 純粋関数で同じことができる。
- **E2E テストを主軸にする**: 遅く壊れやすい。Cloudflare 移行で実行環境も変わるので、移行後に主要フロー数本だけ入れる。
