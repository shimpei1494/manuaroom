import type { AiServicePort } from "../application/ports/ai-service-port";
import type { AiSuggestionRepositoryPort } from "../application/ports/ai-suggestion-repository-port";
import type { AuthPort } from "../application/ports/auth-port";
import type { FileStoragePort } from "../application/ports/file-storage-port";
import type { MaintenanceLogRepositoryPort } from "../application/ports/maintenance-log-repository-port";
import type { MaintenanceTaskRepositoryPort } from "../application/ports/maintenance-task-repository-port";
import type { ManualRepositoryPort } from "../application/ports/manual-repository-port";
import type { ProductRepositoryPort } from "../application/ports/product-repository-port";
import { createOpenAiService } from "./ai/openai-ai-service";
import { localAuth } from "./auth/local-auth";
import { getDb } from "./db/client";
import { createAiSuggestionRepository } from "./db/repositories/ai-suggestion-repository";
import { createMaintenanceLogRepository } from "./db/repositories/maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./db/repositories/maintenance-task-repository";
import { createManualRepository } from "./db/repositories/manual-repository";
import { createProductRepository } from "./db/repositories/product-repository";
import { getRuntimeEnv } from "./env/runtime-env";
import { createLocalFileStorage } from "./storage/local-file-storage";

export type Deps = {
  auth: AuthPort;
  storage: FileStoragePort;
  productRepository: ProductRepositoryPort;
  manualRepository: ManualRepositoryPort;
  maintenanceTaskRepository: MaintenanceTaskRepositoryPort;
  maintenanceLogRepository: MaintenanceLogRepositoryPort;
  aiSuggestionRepository: AiSuggestionRepositoryPort;
  aiService: AiServicePort;
};

let cached: Deps | null = null;

export function getDeps(): Deps {
  if (cached) return cached;
  const env = getRuntimeEnv();
  const db = getDb();
  cached = {
    auth: localAuth,
    storage: createLocalFileStorage(env.UPLOAD_DIR),
    productRepository: createProductRepository(db),
    manualRepository: createManualRepository(db),
    maintenanceTaskRepository: createMaintenanceTaskRepository(db),
    maintenanceLogRepository: createMaintenanceLogRepository(db),
    aiSuggestionRepository: createAiSuggestionRepository(db),
    aiService: createOpenAiService(env),
  };
  return cached;
}
