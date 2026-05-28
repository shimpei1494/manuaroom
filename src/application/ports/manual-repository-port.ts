import type { AiStatus, Manual } from "../../domain/manual/manual";

export type ManualRepositoryPort = {
  create(manual: Manual): Promise<void>;
  findById(input: { userId: string; manualId: string }): Promise<Manual | null>;
  listByProduct(input: { userId: string; productId: string }): Promise<Manual[]>;
  updateAiStatus(input: { userId: string; manualId: string; aiStatus: AiStatus }): Promise<void>;
  delete(input: { userId: string; manualId: string }): Promise<void>;
};
