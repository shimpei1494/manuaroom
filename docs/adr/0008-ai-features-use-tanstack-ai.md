# AI 機能は TanStack AI で書き、説明書チャットは PDF を毎回添えて答える

AI まわり（説明書の解析と、説明書への質問チャット）は TanStack AI（`@tanstack/ai`、`@tanstack/ai-openai`、`@tanstack/ai-react`）で書く。OpenAI SDK を直接は使わない。プロバイダは引き続き OpenAI で、モデルは `gpt-6-luna`。

理由：説明書の解析だけなら OpenAI SDK の直叩きで足りていたが、説明書に質問できるチャット UI を作ることにした。チャットにはストリーミングの受け渡し（サーバーの SSE と画面の受信・表示・停止）が必要で、TanStack AI はこれを `chat()` + `toServerSentEventsResponse()` と `useChat()` でまとめて持っている。TanStack Start（`createFileRoute` の server handler）とそのまま組み合わせられ、構造化出力（zod）と PDF 入力にも対応しているので、解析も同じライブラリに揃えて AI まわりを 1 系統にする。プロバイダを Claude や Gemini に替えて比べたくなったときも、アダプタの差し替えで済む。

## 決めたこと

- **ライブラリの型は infrastructure と入口層に閉じ込める。** `AiServicePort` は自前の型（`ManualChatMessage`）と Web 標準の `Response` だけを使う。チャットのポートは SSE の `Response` をそのまま返し、ユースケースは中身を知らない。`useChat` から届いた履歴を `ManualChatMessage` に変換するのは入口層（`src/server-functions/manual-chat-messages.ts`）。
- **チャットは説明書 1 冊単位。** 説明書カードの「質問する」から開く。サーバーは毎回、説明書 PDF を会話の先頭に添えてから履歴を続けて送る。会話は保存せず、閉じると消える。
- **チャットの API は `POST /api/manuals/:manualId/chat`。** server function ではないので CSRF ミドルウェアの対象外になる。代わりに `Content-Type: application/json` 以外を 415 で断り、別サイトからはブラウザの事前確認（CORS）なしに送れないようにする。Access の検証は他の API と同じくかかる。
- **モデルは解析・チャットとも `gpt-6-luna`。** `gpt-4o-mini` より安く（入力 $0.10 / 出力 $0.50、100 万トークンあたり）、新しい。`@tanstack/ai-openai` 1.0 の model-meta では gpt-6-luna の入力に `document` がないが、OpenAI は vision 対応モデル（gpt-4o 以降）なら PDF を受け付け、ライブラリも入力の種類では送信を止めない。モデルを変えるときは料金と PDF 入力対応を確かめる。

## 注意点

- TanStack AI は 2026-10-22 に 1.0 になったばかりで、それまでは週に何度も破壊的変更が入っていた。上げるときは `vp check` と、モックの OpenAI に向けたローカル確認（下記）をしてからにする。
- Worker のサイズは gzip で約 690 KiB → 930 KiB に増えた（無料プランの上限は 3 MiB）。
- PDF を毎回送るので、長い説明書で何往復もすると入力トークンが増える。気になったら、OpenAI の Files API に一度だけ上げて参照する形（`openaiFiles`）か、Cloudflare Vectorize で関係ページだけを渡す形（RAG）に切り替える。

## ローカルでの確認

OpenAI のキーがなくても、`.dev.vars` に `OPENAI_BASE_URL` を書けば OpenAI SDK の接続先を差し替えられる。`vp run mock:openai`（`scripts/mock-openai.mjs`）が Responses API のストリーミング（`response.output_text.delta` と `response.completed`）を真似るので、解析とチャットの両方を Worker（`vp dev`）上で通しで確かめられる。手順は `.dev.vars.example` のコメントにある。

## 不採用案

- **OpenAI SDK を直接使い続け、SSE と受信側を自前で書く**: 解析だけなら最小だが、チャットのストリーミング・停止・履歴管理を自分で持つことになる。
- **Vercel AI SDK**: 機能は近いが、TanStack Start と同じ作者のライブラリのほうがルートやサーバーハンドラの書き方が揃う。どちらも ports の内側に閉じ込めるので、後から乗り換える費用は小さい。
- **会話を D1 に保存する**: 家族用の小さなアプリで「あとで読み返したい」要望はまだない。必要になったら `@tanstack/ai-persistence` のストアを D1 で実装する。
