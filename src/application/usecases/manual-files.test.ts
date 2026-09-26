import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeManual, makeProduct } from "../testing/fake-deps";
import { deleteManual } from "./delete-manual";
import { deleteProduct } from "./delete-product";
import { MAX_MANUAL_FILE_SIZE_BYTES, uploadManual } from "./upload-manual";

const pdf = {
  body: new ArrayBuffer(8),
  fileName: "manual.pdf",
  fileSize: 8,
  mimeType: "application/pdf",
};

describe("uploadManual", () => {
  test("PDF を保存して未解析の説明書を作る", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    const manual = await uploadManual(deps, { ...pdf, productId: product.id });

    expect(manual.aiStatus).toBe("not_analyzed");
    expect(deps.storage.files.has(manual.fileKey)).toBe(true);
    expect(
      await deps.manualRepository.listByProduct({ userId: product.userId, productId: product.id }),
    ).toEqual([manual]);
  });

  test("20MB を超えるファイルは保存しない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    await expect(
      uploadManual(deps, {
        ...pdf,
        productId: product.id,
        fileSize: MAX_MANUAL_FILE_SIZE_BYTES + 1,
      }),
    ).rejects.toThrow(/exceeds/);
    expect(deps.storage.files.size).toBe(0);
  });

  test("PDF 以外は保存しない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    await expect(
      uploadManual(deps, { ...pdf, productId: product.id, mimeType: "image/png" }),
    ).rejects.toThrow(/Unsupported MIME type/);
    expect(deps.storage.files.size).toBe(0);
  });

  test("他のユーザーの製品には保存しない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct({ userId: "someone-else" });
    await deps.productRepository.create(product);

    await expect(uploadManual(deps, { ...pdf, productId: product.id })).rejects.toThrow(
      NotFoundError,
    );
    expect(deps.storage.files.size).toBe(0);
  });
});

describe("deleteManual", () => {
  test("DB とストレージの両方から消す", async () => {
    const deps = createFakeDeps();
    const manual = makeManual();
    await deps.manualRepository.create(manual);
    await deps.storage.put({
      key: manual.fileKey,
      body: new ArrayBuffer(8),
      contentType: "application/pdf",
    });

    await deleteManual(deps, manual.id);

    expect(
      await deps.manualRepository.findById({ userId: manual.userId, manualId: manual.id }),
    ).toBeNull();
    expect(deps.storage.files.has(manual.fileKey)).toBe(false);
  });
});

describe("deleteProduct", () => {
  test("製品の説明書 PDF をストレージからすべて消す", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);
    const manuals = [makeManual({ productId: product.id }), makeManual({ productId: product.id })];
    await Promise.all(
      manuals.flatMap((manual) => [
        deps.manualRepository.create(manual),
        deps.storage.put({
          key: manual.fileKey,
          body: new ArrayBuffer(8),
          contentType: "application/pdf",
        }),
      ]),
    );

    await deleteProduct(deps, product.id);

    expect(
      await deps.productRepository.findById({ userId: product.userId, productId: product.id }),
    ).toBeNull();
    expect(deps.storage.files.size).toBe(0);
  });
});
