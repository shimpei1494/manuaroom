import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps } from "../testing/fake-deps";
import { createProductFromManual } from "./create-product-from-manual";
import { MAX_MANUAL_FILE_SIZE_BYTES } from "./upload-manual";

const pdf = {
  body: new ArrayBuffer(8),
  fileName: "aircon.pdf",
  fileSize: 8,
  mimeType: "application/pdf",
};

const info = {
  name: "ルームエアコン",
  manufacturer: "ダイキン",
  modelNumber: "AN22ZES",
  category: "エアコン",
};

describe("createProductFromManual", () => {
  test("読み取った情報で製品を登録し、説明書を未解析のまま紐付ける", async () => {
    const deps = createFakeDeps({ extractProductInfo: () => Promise.resolve(info) });

    const { product, manual } = await createProductFromManual(deps, pdf);

    expect(product).toMatchObject({ ...info, location: null, purchaseDate: null });
    expect(manual).toMatchObject({
      productId: product.id,
      fileName: "aircon.pdf",
      aiStatus: "not_analyzed",
    });
    expect(
      await deps.productRepository.findById({ userId: product.userId, productId: product.id }),
    ).toEqual(product);
    expect(
      await deps.manualRepository.listByProduct({ userId: product.userId, productId: product.id }),
    ).toEqual([manual]);
    expect(deps.storage.files.has(manual.fileKey)).toBe(true);
  });

  test("製品名が読めなければファイル名で登録する", async () => {
    const deps = createFakeDeps();

    const { product } = await createProductFromManual(deps, pdf);

    expect(product.name).toBe("aircon");
  });

  test("AI が失敗したら何も登録しない", async () => {
    const deps = createFakeDeps({ extractProductInfo: () => Promise.reject(new Error("quota")) });

    await expect(createProductFromManual(deps, pdf)).rejects.toThrow("quota");

    expect(await deps.productRepository.listByUser("test-user")).toEqual([]);
    expect(deps.storage.files.size).toBe(0);
  });

  test("PDF 以外や 20MB 超は AI に渡さず断る", async () => {
    let called = false;
    const deps = createFakeDeps({
      extractProductInfo: () => {
        called = true;
        return Promise.resolve(info);
      },
    });

    await expect(createProductFromManual(deps, { ...pdf, mimeType: "image/png" })).rejects.toThrow(
      /Unsupported MIME type/,
    );
    await expect(
      createProductFromManual(deps, { ...pdf, fileSize: MAX_MANUAL_FILE_SIZE_BYTES + 1 }),
    ).rejects.toThrow(/exceeds/);
    expect(called).toBe(false);
    expect(await deps.productRepository.listByUser("test-user")).toEqual([]);
  });

  test("説明書の保存に失敗したら登録した製品を消す", async () => {
    const deps = createFakeDeps({ extractProductInfo: () => Promise.resolve(info) });
    deps.storage.put = () => Promise.reject(new Error("R2 down"));

    await expect(createProductFromManual(deps, pdf)).rejects.toThrow("R2 down");

    expect(await deps.productRepository.listByUser("test-user")).toEqual([]);
  });
});
