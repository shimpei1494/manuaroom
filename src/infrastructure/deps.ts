import type { Deps } from "../application/deps";
import { createTanstackAiService } from "./ai/tanstack-ai-service";
import { readAccessConfig } from "./auth/access-config";
import { localAuth } from "./auth/local-auth";
import { createSharedUserAuth } from "./auth/shared-user-auth";
import { systemClock } from "./clock/system-clock";
import { createDb } from "./db/client";
import { createAiSuggestionRepository } from "./db/repositories/ai-suggestion-repository";
import { createMaintenanceLedger } from "./db/repositories/maintenance-ledger";
import { createMaintenanceLogRepository } from "./db/repositories/maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./db/repositories/maintenance-task-repository";
import { createManualRepository } from "./db/repositories/manual-repository";
import { createProductRepository } from "./db/repositories/product-repository";
import { getRuntimeEnv, type RuntimeEnv } from "./env/runtime-env";
import {
  consoleNotifier,
  createLineBroadcastNotifier,
} from "./notification/line-broadcast-notifier";
import { createR2FileStorage } from "./storage/r2-file-storage";

function createDeps(env: RuntimeEnv): Deps {
  const db = createDb(env.DB);
  return {
    // vp dev ではログインなしの固定ユーザー。ビルドした Worker では必ず Access 側の設定を使う
    auth: import.meta.env.DEV ? localAuth : createSharedUserAuth(readAccessConfig(env).appUserId),
    clock: systemClock,
    storage: createR2FileStorage(env.BUCKET),
    productRepository: createProductRepository(db),
    manualRepository: createManualRepository(db),
    maintenanceTaskRepository: createMaintenanceTaskRepository(db),
    maintenanceLogRepository: createMaintenanceLogRepository(db),
    maintenanceLedger: createMaintenanceLedger(db),
    aiSuggestionRepository: createAiSuggestionRepository(db),
    aiService: createTanstackAiService(env),
    notifier: env.LINE_CHANNEL_ACCESS_TOKEN
      ? createLineBroadcastNotifier({ channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN })
      : consoleNotifier,
  };
}

let cached: Deps | null = null;

/** バインディングは Worker の生存中は変わらないので、組み立てた依存を使い回す。 */
export function getDeps(): Deps {
  cached ??= createDeps(getRuntimeEnv());
  return cached;
}
