import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";

import type { FileStoragePort } from "../../application/ports/file-storage-port";

/**
 * ローカルファイルストレージ実装。
 * 本番では同じ FileStoragePort を R2 実装に差し替える。
 * contentType はローカルでは保存しない（MVP は PDF 限定なので get 時は固定値を返す）。
 */
export function createLocalFileStorage(uploadDir: string): FileStoragePort {
  return {
    async put({ key, body }) {
      const filePath = join(uploadDir, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(body));
    },
    async get(key) {
      const filePath = join(uploadDir, key);
      try {
        await stat(filePath);
      } catch {
        return null;
      }
      const nodeStream = createReadStream(filePath);
      const body = Readable.toWeb(nodeStream) as ReadableStream;
      return { body, contentType: "application/pdf" };
    },
    async delete(key) {
      const filePath = join(uploadDir, key);
      await rm(filePath, { force: true });
    },
  };
}
