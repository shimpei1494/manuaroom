import type { AiServicePort } from "./ports/ai-service-port";
import type { AiSuggestionRepositoryPort } from "./ports/ai-suggestion-repository-port";
import type { AuthPort } from "./ports/auth-port";
import type { ClockPort } from "./ports/clock-port";
import type { FileStoragePort } from "./ports/file-storage-port";
import type { MaintenanceLogRepositoryPort } from "./ports/maintenance-log-repository-port";
import type { MaintenanceTaskRepositoryPort } from "./ports/maintenance-task-repository-port";
import type { ManualRepositoryPort } from "./ports/manual-repository-port";
import type { NotifierPort } from "./ports/notifier-port";
import type { ProductRepositoryPort } from "./ports/product-repository-port";

/**
 * ユースケースが受け取る依存の一覧 (ADR-0007)。
 * 各ユースケースは `Pick<Deps, ...>` で必要なものだけを受け取る。
 */
export type Deps = {
  auth: AuthPort;
  clock: ClockPort;
  storage: FileStoragePort;
  productRepository: ProductRepositoryPort;
  manualRepository: ManualRepositoryPort;
  maintenanceTaskRepository: MaintenanceTaskRepositoryPort;
  maintenanceLogRepository: MaintenanceLogRepositoryPort;
  aiSuggestionRepository: AiSuggestionRepositoryPort;
  aiService: AiServicePort;
  notifier: NotifierPort;
};
