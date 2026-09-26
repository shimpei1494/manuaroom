import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { analyzeManual } from "../application/usecases/analyze-manual";
import { deleteManual } from "../application/usecases/delete-manual";
import { listManuals } from "../application/usecases/list-manuals";
import {
  ALLOWED_MANUAL_MIME_TYPES,
  MAX_MANUAL_FILE_SIZE_BYTES,
  uploadManual,
} from "../application/usecases/upload-manual";
import { getDeps } from "../infrastructure/deps";

const ProductIdSchema = z.object({ productId: z.string().min(1) });
const ManualIdSchema = z.object({ manualId: z.string().min(1) });

export const listManualsFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    return listManuals(getDeps(), data.productId);
  });

export const uploadManualFn = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => {
    const file = data.get("file");
    const productId = data.get("productId");
    if (!(file instanceof File)) throw new Error("file is required");
    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error("productId is required");
    }
    if (file.size > MAX_MANUAL_FILE_SIZE_BYTES) {
      throw new Error(
        `ファイルサイズが上限 ${(MAX_MANUAL_FILE_SIZE_BYTES / 1024 / 1024).toString()}MB を超えています`,
      );
    }
    if (
      !ALLOWED_MANUAL_MIME_TYPES.includes(file.type as (typeof ALLOWED_MANUAL_MIME_TYPES)[number])
    ) {
      throw new Error(`PDF ファイルのみアップロード可能です (受信: ${file.type})`);
    }
    return { file, productId };
  })
  .handler(async ({ data }) => {
    const buffer = await data.file.arrayBuffer();
    return uploadManual(getDeps(), {
      productId: data.productId,
      body: buffer,
      fileName: data.file.name,
      fileSize: data.file.size,
      mimeType: data.file.type,
    });
  });

export const deleteManualFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ManualIdSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteManual(getDeps(), data.manualId);
  });

export const analyzeManualFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ManualIdSchema.parse(data))
  .handler(async ({ data }) => {
    return analyzeManual(getDeps(), data.manualId);
  });
