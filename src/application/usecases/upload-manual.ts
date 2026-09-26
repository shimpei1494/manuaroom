import type { Manual } from "../../domain/manual/manual";
import type { Deps } from "../../infrastructure/deps";

export const MAX_MANUAL_FILE_SIZE_BYTES = 20 * 1024 * 1024; // Q11-1: 20MB
export const ALLOWED_MANUAL_MIME_TYPES = ["application/pdf"] as const; // Q11-2

export type UploadManualInput = {
  productId: string;
  body: ArrayBuffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export async function uploadManual(deps: Deps, input: UploadManualInput): Promise<Manual> {
  if (input.fileSize > MAX_MANUAL_FILE_SIZE_BYTES) {
    throw new Error(
      `File size ${input.fileSize.toString()} exceeds ${MAX_MANUAL_FILE_SIZE_BYTES.toString()} byte limit`,
    );
  }
  if (
    !ALLOWED_MANUAL_MIME_TYPES.includes(
      input.mimeType as (typeof ALLOWED_MANUAL_MIME_TYPES)[number],
    )
  ) {
    throw new Error(`Unsupported MIME type: ${input.mimeType}. Only PDF is allowed.`);
  }

  const userId = await deps.auth.requireUserId();

  const product = await deps.productRepository.findById({ userId, productId: input.productId });
  if (!product) {
    throw new Error(`Product not found: ${input.productId}`);
  }

  const manualId = crypto.randomUUID();
  const fileKey = `manuals/${userId}/${input.productId}/${manualId}.pdf`;

  await deps.storage.put({
    key: fileKey,
    body: input.body,
    contentType: input.mimeType,
  });

  const manual: Manual = {
    id: manualId,
    userId,
    productId: input.productId,
    fileKey,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    pageCount: null,
    aiStatus: "not_analyzed",
    createdAt: new Date(),
  };

  await deps.manualRepository.create(manual);
  return manual;
}
