export const AI_STATUS_VALUES = ["not_analyzed", "analyzing", "done", "error"] as const;
export type AiStatus = (typeof AI_STATUS_VALUES)[number];

export type Manual = {
  id: string;
  userId: string;
  productId: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number | null;
  aiStatus: AiStatus;
  createdAt: Date;
};
