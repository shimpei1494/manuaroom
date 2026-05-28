import type { MaintenancePayload } from "../../domain/ai-suggestion/ai-suggestion";

export type AiServicePort = {
  analyzeManualForMaintenance(input: {
    pdf: ArrayBuffer;
    fileName: string;
  }): Promise<MaintenancePayload[]>;
};
