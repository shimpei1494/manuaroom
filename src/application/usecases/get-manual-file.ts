import type { Deps } from "../../infrastructure/deps";

export type ManualFileResponse = {
  body: ReadableStream;
  contentType: string;
  fileName: string;
};

export async function getManualFile(deps: Deps, manualId: string): Promise<ManualFileResponse> {
  const userId = await deps.auth.requireUserId();
  const manual = await deps.manualRepository.findById({ userId, manualId });
  if (!manual) {
    throw new Error(`Manual not found: ${manualId}`);
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
