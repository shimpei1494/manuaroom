import type { Deps } from "../application/deps";
import { createOpenAiService } from "./ai/openai-ai-service";
import { localAuth } from "./auth/local-auth";
import { systemClock } from "./clock/system-clock";
import { getDb } from "./db/client";
import { createAiSuggestionRepository } from "./db/repositories/ai-suggestion-repository";
import { createMaintenanceLogRepository } from "./db/repositories/maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./db/repositories/maintenance-task-repository";
import { createManualRepository } from "./db/repositories/manual-repository";
import { createProductRepository } from "./db/repositories/product-repository";
import { getRuntimeEnv } from "./env/runtime-env";
import { createLocalFileStorage } from "./storage/local-file-storage";

let cached: Deps | null = null;

export function getDeps(): Deps {
  if (cached) return cached;
  const env = getRuntimeEnv();
  const db = getDb();
  cached = {
    auth: localAuth,
    clock: systemClock,
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
