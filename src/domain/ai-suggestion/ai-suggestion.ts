import type { IntervalUnit } from "../maintenance/maintenance-task";

export const AI_SUGGESTION_TYPE_VALUES = ["maintenance"] as const;
export type AiSuggestionType = (typeof AI_SUGGESTION_TYPE_VALUES)[number];

export const AI_SUGGESTION_STATUS_VALUES = ["pending", "accepted", "rejected"] as const;
export type AiSuggestionStatus = (typeof AI_SUGGESTION_STATUS_VALUES)[number];

export type MaintenancePayload = {
  title: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit | null;
  memo: string | null;
  sourcePage: number | null;
  url: string | null;
};

export type AiSuggestion = {
  id: string;
  userId: string;
  productId: string;
  manualId: string;
  type: AiSuggestionType;
  payload: MaintenancePayload;
  status: AiSuggestionStatus;
  createdAt: Date;
};
