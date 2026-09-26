import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import { startLocalCloudflareEnv } from "../testing/local-cloudflare-env";
import { createR2FileStorage } from "./r2-file-storage";

// ローカル R2 (Miniflare) に対する結合テスト。

let bucket: R2Bucket;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const local = await startLocalCloudflareEnv();
  bucket = local.env.BUCKET;
  dispose = local.dispose;
});

afterAll(async () => {
  await dispose();
});

test("保存したファイルを中身と Content-Type ごと取り出せる", async () => {
  const storage = createR2FileStorage(bucket);
  const body = new TextEncoder().encode("%PDF-1.4 test");
  await storage.put({
    key: "manuals/u/p/m.pdf",
    body: body.buffer,
    contentType: "application/pdf",
  });

  const file = await storage.get("manuals/u/p/m.pdf");

  expect(file?.contentType).toBe("application/pdf");
  expect(await new Response(file?.body).text()).toBe("%PDF-1.4 test");
});

test("削除したファイルと存在しないファイルは null になる", async () => {
  const storage = createR2FileStorage(bucket);
  await storage.put({
    key: "manuals/u/p/deleted.pdf",
    body: new ArrayBuffer(1),
    contentType: "application/pdf",
  });

  await storage.delete("manuals/u/p/deleted.pdf");

  expect(await storage.get("manuals/u/p/deleted.pdf")).toBeNull();
  expect(await storage.get("manuals/u/p/missing.pdf")).toBeNull();
});
