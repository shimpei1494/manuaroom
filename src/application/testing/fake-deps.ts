import type { AiSuggestion, MaintenancePayload } from "../../domain/ai-suggestion/ai-suggestion";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Manual } from "../../domain/manual/manual";
import type { Product } from "../../domain/product/product";
import type { Deps } from "../deps";
import type { AiSuggestionRepositoryPort } from "../ports/ai-suggestion-repository-port";
import type { FileStoragePort } from "../ports/file-storage-port";
import type { MaintenanceLogRepositoryPort } from "../ports/maintenance-log-repository-port";
import type { MaintenanceTaskRepositoryPort } from "../ports/maintenance-task-repository-port";
import type { ManualRepositoryPort } from "../ports/manual-repository-port";
import type { ProductRepositoryPort } from "../ports/product-repository-port";

/**
 * ユースケースのテスト用の依存一式 (docs/testing.md)。
 * リポジトリとストレージはメモリ上の実装で、DB の CASCADE は再現しない。
 */

const TEST_USER_ID = "test-user";
const DEFAULT_NOW = new Date("2026-01-01T00:00:00Z");

type FakeDepsOptions = {
  now?: Date;
  userId?: string;
  analyzeManual?: () => Promise<MaintenancePayload[]>;
};

export type FakeDeps = Deps & {
  storage: InMemoryFileStorage;
  /** テスト中に時計を進める。 */
  setNow(now: Date): void;
};

export function createFakeDeps(options: FakeDepsOptions = {}): FakeDeps {
  let now = options.now ?? DEFAULT_NOW;
  const userId = options.userId ?? TEST_USER_ID;
  return {
    auth: { requireUserId: () => Promise.resolve(userId) },
    clock: { now: () => now },
    setNow(next) {
      now = next;
    },
    storage: createInMemoryFileStorage(),
    productRepository: createInMemoryProductRepository(),
    manualRepository: createInMemoryManualRepository(),
    maintenanceTaskRepository: createInMemoryMaintenanceTaskRepository(),
    maintenanceLogRepository: createInMemoryMaintenanceLogRepository(),
    aiSuggestionRepository: createInMemoryAiSuggestionRepository(),
    aiService: {
      analyzeManualForMaintenance: options.analyzeManual ?? (() => Promise.resolve([])),
    },
  };
}

// ---- テストデータ ----

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    userId: TEST_USER_ID,
    name: "エアコン",
    manufacturer: null,
    modelNumber: null,
    category: null,
    location: null,
    purchaseDate: null,
    warrantyUntil: null,
    memo: null,
    createdAt: DEFAULT_NOW,
    updatedAt: DEFAULT_NOW,
    ...overrides,
  };
}

export function makeManual(overrides: Partial<Manual> = {}): Manual {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    userId: TEST_USER_ID,
    productId: "product-1",
    fileKey: `manuals/${TEST_USER_ID}/product-1/${id}.pdf`,
    fileName: "manual.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
    pageCount: null,
    aiStatus: "not_analyzed",
    createdAt: DEFAULT_NOW,
    ...overrides,
  };
}

export function makeMaintenanceTask(overrides: Partial<MaintenanceTask> = {}): MaintenanceTask {
  return {
    id: crypto.randomUUID(),
    userId: TEST_USER_ID,
    productId: "product-1",
    title: "フィルター掃除",
    intervalValue: null,
    intervalUnit: null,
    nextDueDate: null,
    lastDoneAt: null,
    memo: null,
    url: null,
    source: "manual",
    sourceManualId: null,
    sourcePage: null,
    createdAt: DEFAULT_NOW,
    updatedAt: DEFAULT_NOW,
    ...overrides,
  };
}

export function makeAiSuggestion(overrides: Partial<AiSuggestion> = {}): AiSuggestion {
  return {
    id: crypto.randomUUID(),
    userId: TEST_USER_ID,
    productId: "product-1",
    manualId: "manual-1",
    type: "maintenance",
    payload: {
      title: "フィルター掃除",
      intervalValue: 2,
      intervalUnit: "week",
      memo: null,
      sourcePage: 12,
      url: null,
    },
    status: "pending",
    createdAt: DEFAULT_NOW,
    ...overrides,
  };
}

// ---- インメモリ実装 ----

type InMemoryFileStorage = FileStoragePort & {
  readonly files: Map<string, { body: ArrayBuffer; contentType: string }>;
};

function createInMemoryFileStorage(): InMemoryFileStorage {
  const files = new Map<string, { body: ArrayBuffer; contentType: string }>();
  return {
    files,
    put({ key, body, contentType }) {
      files.set(key, { body, contentType });
      return Promise.resolve();
    },
    get(key) {
      const file = files.get(key);
      if (!file) return Promise.resolve(null);
      return Promise.resolve({
        body: new Response(file.body).body ?? new ReadableStream(),
        contentType: file.contentType,
      });
    },
    delete(key) {
      files.delete(key);
      return Promise.resolve();
    },
  };
}

function byNextDueDate(a: MaintenanceTask, b: MaintenanceTask): number {
  // SQLite の昇順と同じく null を先頭にする
  return (a.nextDueDate?.getTime() ?? -Infinity) - (b.nextDueDate?.getTime() ?? -Infinity);
}

function createInMemoryProductRepository(): ProductRepositoryPort {
  const rows = new Map<string, Product>();
  const owned = (userId: string, id: string) => {
    const row = rows.get(id);
    return row?.userId === userId ? row : null;
  };
  return {
    create(product) {
      rows.set(product.id, product);
      return Promise.resolve();
    },
    findById({ userId, productId }) {
      return Promise.resolve(owned(userId, productId));
    },
    listByUser(userId) {
      return Promise.resolve([...rows.values()].filter((p) => p.userId === userId));
    },
    update(product) {
      if (owned(product.userId, product.id)) rows.set(product.id, product);
      return Promise.resolve();
    },
    delete({ userId, productId }) {
      if (owned(userId, productId)) rows.delete(productId);
      return Promise.resolve();
    },
  };
}

function createInMemoryManualRepository(): ManualRepositoryPort {
  const rows = new Map<string, Manual>();
  const owned = (userId: string, id: string) => {
    const row = rows.get(id);
    return row?.userId === userId ? row : null;
  };
  return {
    create(manual) {
      rows.set(manual.id, manual);
      return Promise.resolve();
    },
    findById({ userId, manualId }) {
      return Promise.resolve(owned(userId, manualId));
    },
    listByProduct({ userId, productId }) {
      return Promise.resolve(
        [...rows.values()].filter((m) => m.userId === userId && m.productId === productId),
      );
    },
    updateAiStatus({ userId, manualId, aiStatus }) {
      const row = owned(userId, manualId);
      if (row) rows.set(manualId, { ...row, aiStatus });
      return Promise.resolve();
    },
    delete({ userId, manualId }) {
      if (owned(userId, manualId)) rows.delete(manualId);
      return Promise.resolve();
    },
  };
}

function createInMemoryMaintenanceTaskRepository(): MaintenanceTaskRepositoryPort {
  const rows = new Map<string, MaintenanceTask>();
  const owned = (userId: string, id: string) => {
    const row = rows.get(id);
    return row?.userId === userId ? row : null;
  };
  return {
    create(task) {
      rows.set(task.id, task);
      return Promise.resolve();
    },
    findById({ userId, taskId }) {
      return Promise.resolve(owned(userId, taskId));
    },
    listByUser(userId) {
      return Promise.resolve(
        [...rows.values()].filter((t) => t.userId === userId).sort(byNextDueDate),
      );
    },
    listByProduct({ userId, productId }) {
      return Promise.resolve(
        [...rows.values()]
          .filter((t) => t.userId === userId && t.productId === productId)
          .sort(byNextDueDate),
      );
    },
    update(task) {
      if (owned(task.userId, task.id)) rows.set(task.id, task);
      return Promise.resolve();
    },
    delete({ userId, taskId }) {
      if (owned(userId, taskId)) rows.delete(taskId);
      return Promise.resolve();
    },
  };
}

function createInMemoryMaintenanceLogRepository(): MaintenanceLogRepositoryPort {
  const rows: MaintenanceLog[] = [];
  return {
    create(log) {
      rows.push(log);
      return Promise.resolve();
    },
    listByTask({ userId, taskId }) {
      return Promise.resolve(rows.filter((l) => l.userId === userId && l.taskId === taskId));
    },
    listByKind({ userId, kind }) {
      return Promise.resolve(rows.filter((l) => l.userId === userId && l.kind === kind));
    },
  };
}

function createInMemoryAiSuggestionRepository(): AiSuggestionRepositoryPort {
  let rows: AiSuggestion[] = [];
  return {
    replaceByManual({ userId, manualId, suggestions }) {
      rows = [
        ...rows.filter((s) => !(s.userId === userId && s.manualId === manualId)),
        ...suggestions,
      ];
      return Promise.resolve();
    },
    findById({ userId, suggestionId }) {
      return Promise.resolve(
        rows.find((s) => s.userId === userId && s.id === suggestionId) ?? null,
      );
    },
    listByManual({ userId, manualId }) {
      return Promise.resolve(rows.filter((s) => s.userId === userId && s.manualId === manualId));
    },
    updateStatus({ userId, suggestionId, status }) {
      rows = rows.map((s) => (s.userId === userId && s.id === suggestionId ? { ...s, status } : s));
      return Promise.resolve();
    },
  };
}
