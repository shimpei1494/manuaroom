import type { AiSuggestion, AiSuggestionStatus } from "../../domain/ai-suggestion/ai-suggestion";

export type AiSuggestionRepositoryPort = {
  /**
   * 指定された Manual の既存 AI Suggestion を全削除し、新しい候補で置き換える (Q12)。
   * 単一トランザクションで実行される。
   */
  replaceByManual(input: {
    userId: string;
    manualId: string;
    suggestions: AiSuggestion[];
  }): Promise<void>;
  findById(input: { userId: string; suggestionId: string }): Promise<AiSuggestion | null>;
  listByManual(input: { userId: string; manualId: string }): Promise<AiSuggestion[]>;
  updateStatus(input: {
    userId: string;
    suggestionId: string;
    status: AiSuggestionStatus;
  }): Promise<void>;
};
