import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { AiServicePort } from "../../application/ports/ai-service-port";
import { INTERVAL_UNIT_VALUES } from "../../domain/maintenance/maintenance-task";
import { requireOpenAiApiKey, type RuntimeEnv } from "../env/runtime-env";

const MAINTENANCE_EXTRACTION_MODEL = "gpt-4o-mini";

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

const SYSTEM_PROMPT = `あなたは家電・家具・住宅設備の取扱説明書PDFを解析する専門家です。
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

export function createOpenAiService(env: RuntimeEnv): AiServicePort {
  let client: OpenAI | null = null;
  function getClient(): OpenAI {
    if (client) return client;
    client = new OpenAI({ apiKey: requireOpenAiApiKey(env) });
    return client;
  }

  return {
    async analyzeManualForMaintenance({ pdf, fileName }) {
      const base64 = Buffer.from(pdf).toString("base64");
      const completion = await getClient().chat.completions.parse({
        model: MAINTENANCE_EXTRACTION_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: fileName,
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "この説明書からメンテナンス・交換項目を抽出してください。",
              },
            ],
          },
        ],
        response_format: zodResponseFormat(MaintenanceResponseSchema, "maintenances"),
      });

      const parsed = completion.choices[0]?.message.parsed;
      if (!parsed) {
        throw new Error("OpenAI response did not return parsed maintenance suggestions");
      }
      return parsed.maintenances;
    },
  };
}
