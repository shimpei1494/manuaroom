import type { MaintenancePayload } from "../../domain/ai-suggestion/ai-suggestion";
import type { ManualProductInfo } from "../../domain/product/product-from-manual";

/** 説明書チャットの 1 発言。画面側の表現 (UIMessage など) は入口層で変換する。 */
export type ManualChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AiServicePort = {
  analyzeManualForMaintenance(input: {
    pdf: ArrayBuffer;
    fileName: string;
  }): Promise<MaintenancePayload[]>;
  /** 説明書 PDF の表紙などから製品名・メーカー・型番・カテゴリを読み取る。 */
  extractProductInfo(input: { pdf: ArrayBuffer; fileName: string }): Promise<ManualProductInfo>;
  /**
   * 説明書 PDF を読ませたうえで会話の続きを答えさせる。
   * 返り値はそのままクライアントへ返すストリーミング応答 (SSE)。
   */
  answerAboutManual(input: {
    pdf: ArrayBuffer;
    fileName: string;
    productName: string;
    threadId: string;
    messages: ManualChatMessage[];
  }): Response;
};
