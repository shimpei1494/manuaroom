import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { analyzeManual } from "../application/usecases/analyze-manual";
import { deleteManual } from "../application/usecases/delete-manual";
import { listManuals } from "../application/usecases/list-manuals";
import { uploadManual } from "../application/usecases/upload-manual";
import { getDeps } from "../infrastructure/deps";
import { parseManualFile } from "./manual-file-form";

const ProductIdSchema = z.object({ productId: z.string().min(1) });
const ManualIdSchema = z.object({ manualId: z.string().min(1) });

export const listManualsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    return listManuals(getDeps(), data.productId);
  });

export const uploadManualFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const productId = data.get("productId");
    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error("productId is required");
    }
    const file = parseManualFile(data);
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
  .validator((data: unknown) => ManualIdSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteManual(getDeps(), data.manualId);
  });

export const analyzeManualFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ManualIdSchema.parse(data))
  .handler(async ({ data }) => {
    return analyzeManual(getDeps(), data.manualId);
  });
