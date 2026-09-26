import { NotFoundError } from "../../domain/errors";
import type { Deps } from "../deps";

export type ManualFileResponse = {
  body: ReadableStream;
  contentType: string;
  fileName: string;
};

export async function getManualFile(
  deps: Pick<Deps, "auth" | "manualRepository" | "storage">,
  manualId: string,
): Promise<ManualFileResponse> {
  const userId = await deps.auth.requireUserId();
  const manual = await deps.manualRepository.findById({ userId, manualId });
  if (!manual) {
    throw new NotFoundError("Manual", manualId);
  }
  const file = await deps.storage.get(manual.fileKey);
  if (!file) {
    throw new Error(`Manual file missing from storage: ${manual.fileKey}`);
  }
  return {
    body: file.body,
    contentType: manual.mimeType,
    fileName: manual.fileName,
  };
}
