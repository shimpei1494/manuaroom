import type { AiSuggestion, AiSuggestionStatus } from "../../domain/ai-suggestion/ai-suggestion";

export type AiSuggestionRepositoryPort = {
  createMany(suggestions: AiSuggestion[]): Promise<void>;
  findById(input: { userId: string; suggestionId: string }): Promise<AiSuggestion | null>;
  listByManual(input: { userId: string; manualId: string }): Promise<AiSuggestion[]>;
  updateStatus(input: {
    userId: string;
    suggestionId: string;
    status: AiSuggestionStatus;
  }): Promise<void>;
  deleteByManual(input: { userId: string; manualId: string }): Promise<void>;
};
