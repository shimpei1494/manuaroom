import type { FileStoragePort } from "../../application/ports/file-storage-port";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

/**
 * R2 バケットを使うファイルストレージ実装。
 * ローカル開発では Miniflare のローカル R2 (.wrangler/state/) に保存される。
 */
export function createR2FileStorage(bucket: R2Bucket): FileStoragePort {
  return {
    async put({ key, body, contentType }) {
      await bucket.put(key, body, { httpMetadata: { contentType } });
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) return null;
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType ?? FALLBACK_CONTENT_TYPE,
      };
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
