import type { Deps } from "../application/deps";
import { createOpenAiService } from "./ai/openai-ai-service";
import { localAuth } from "./auth/local-auth";
import { systemClock } from "./clock/system-clock";
import { createDb } from "./db/client";
import { createAiSuggestionRepository } from "./db/repositories/ai-suggestion-repository";
import { createMaintenanceLogRepository } from "./db/repositories/maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./db/repositories/maintenance-task-repository";
import { createManualRepository } from "./db/repositories/manual-repository";
import { createProductRepository } from "./db/repositories/product-repository";
import { getRuntimeEnv, type RuntimeEnv } from "./env/runtime-env";
import { createR2FileStorage } from "./storage/r2-file-storage";

function createDeps(env: RuntimeEnv): Deps {
  const db = createDb(env.DB);
  return {
    auth: localAuth,
    clock: systemClock,
    storage: createR2FileStorage(env.BUCKET),
    productRepository: createProductRepository(db),
    manualRepository: createManualRepository(db),
    maintenanceTaskRepository: createMaintenanceTaskRepository(db),
    maintenanceLogRepository: createMaintenanceLogRepository(db),
    aiSuggestionRepository: createAiSuggestionRepository(db),
    aiService: createOpenAiService(env),
  };
}

let cached: Deps | null = null;

/** バインディングは Worker の生存中は変わらないので、組み立てた依存を使い回す。 */
export function getDeps(): Deps {
  cached ??= createDeps(getRuntimeEnv());
  return cached;
}
