import type { Manual } from "../../domain/manual/manual";
import type { Product } from "../../domain/product/product";
import { productFieldsFromManualInfo } from "../../domain/product/product-from-manual";
import type { Deps } from "../deps";
import { createProduct } from "./create-product";
import { assertManualFile, uploadManual } from "./upload-manual";

export type CreateProductFromManualInput = {
  body: ArrayBuffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

/**
 * 説明書 PDF から製品情報を AI で読み取り、そのまま製品を登録して説明書を紐付ける。
 * 内容はあとから製品の編集で直す前提で、確認画面は挟まない。
 * メンテナンス項目の解析 (analyzeManual) は別操作で、ここでは行わない。
 */
export async function createProductFromManual(
  deps: Pick<
    Deps,
    "auth" | "clock" | "productRepository" | "storage" | "manualRepository" | "aiService"
  >,
  input: CreateProductFromManualInput,
): Promise<{ product: Product; manual: Manual }> {
  assertManualFile(input);
  await deps.auth.requireUserId();

  const info = await deps.aiService.extractProductInfo({
    pdf: input.body,
    fileName: input.fileName,
  });
  const product = await createProduct(deps, productFieldsFromManualInfo(info, input.fileName));

  try {
    const manual = await uploadManual(deps, { ...input, productId: product.id });
    return { product, manual };
  } catch (error) {
    // 説明書のない製品だけが残らないようにする
    await deps.productRepository.delete({ userId: product.userId, productId: product.id });
    throw error;
  }
}
