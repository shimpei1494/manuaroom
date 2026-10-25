import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { z } from "zod";

import type { AiServicePort } from "../../application/ports/ai-service-port";
import { INTERVAL_UNIT_VALUES } from "../../domain/maintenance/maintenance-task";
import { requireOpenAiApiKey, type RuntimeEnv } from "../env/runtime-env";

// 解析もチャットも同じモデル。変えるときは料金と PDF 入力対応を確かめる (ADR 0008)
// @tanstack/ai-openai 1.0 のモデル定義では gpt-6-luna の入力に document がないが、
// OpenAI は vision 対応モデルなら PDF を受け付け、ライブラリも入力の種類では止めない
const OPENAI_MODEL = "gpt-6-luna";

const MaintenancePayloadSchema = z.object({
  title: z.string(),
  intervalValue: z.number().int().positive().nullable(),
  intervalUnit: z.enum(INTERVAL_UNIT_VALUES).nullable(),
  memo: z.string().nullable(),
  sourcePage: z.number().int().positive().nullable(),
  url: z.string().nullable(),
});

const MaintenanceResponseSchema = z.object({
  maintenances: z.array(MaintenancePayloadSchema),
});

const EXTRACTION_SYSTEM_PROMPT = `あなたは家電・家具・住宅設備の取扱説明書PDFを解析する専門家です。
ユーザーが定期的に実施すべきメンテナンス項目と、消耗品の交換項目を抽出してください。

各項目について以下を抽出します:
- title: メンテナンスの内容を表す簡潔な名前 (例: "フィルター清掃", "排水パン交換")
- intervalValue + intervalUnit: 推奨周期 (例: 2週間ごと → intervalValue=2, intervalUnit="week")
- sourcePage: 説明書のどのページに記載されているか (1始まり)
- memo: 補足説明 (任意)
- url: 説明書本文に書かれている関連URL (任意)

ルール:
- 不明な情報は null にする
- メンテナンス項目が見つからない場合は空配列を返す
- 推測ではなく、説明書に明示的に書かれている内容のみを抽出する`;

function chatSystemPrompt(productName: string): string {
  return `あなたは「${productName}」の取扱説明書について答えるアシスタントです。
添付の説明書PDFの内容にもとづいて、日本語で簡潔に答えてください。

ルール:
- 説明書に書かれていることを優先し、根拠にしたページ番号を「(p.12)」のように添える
- 説明書に書かれていないことは、そう伝えたうえで一般的な注意として答える
- 分解や電気工事など危険を伴う作業は、メーカーや専門業者への相談を勧める`;
}

function pdfPart(pdf: ArrayBuffer, fileName: string) {
  return {
    type: "document" as const,
    source: {
      type: "data" as const,
      value: Buffer.from(pdf).toString("base64"),
      mimeType: "application/pdf",
    },
    metadata: { filename: fileName },
  };
}

export function createTanstackAiService(env: RuntimeEnv): AiServicePort {
  function adapter() {
    return createOpenaiChat(OPENAI_MODEL, requireOpenAiApiKey(env));
  }

  return {
    async analyzeManualForMaintenance({ pdf, fileName }) {
      const result = await chat({
        adapter: adapter(),
        // 1 回きりの呼び出しなので会話のまとまりは毎回新しく作る
        threadId: crypto.randomUUID(),
        systemPrompts: [EXTRACTION_SYSTEM_PROMPT],
        messages: [
          {
            role: "user",
            content: [
              pdfPart(pdf, fileName),
              { type: "text", content: "この説明書からメンテナンス・交換項目を抽出してください。" },
            ],
          },
        ],
        outputSchema: MaintenanceResponseSchema,
      });
      return result.maintenances;
    },

    answerAboutManual({ pdf, fileName, productName, threadId, messages }) {
      const abortController = new AbortController();
      const stream = chat({
        adapter: adapter(),
        threadId,
        systemPrompts: [chatSystemPrompt(productName)],
        // 会話は保存しないので、毎回先頭に説明書を添えてから履歴を続ける
        messages: [
          {
            role: "user",
            content: [
              pdfPart(pdf, fileName),
              { type: "text", content: "この説明書について質問します。" },
            ],
          },
          ...messages.map((message) => ({ role: message.role, content: message.text })),
        ],
        abortController,
      });
      return toServerSentEventsResponse(stream, { abortController });
    },
  };
}
