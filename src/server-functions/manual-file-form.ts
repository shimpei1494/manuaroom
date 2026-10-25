import {
  ALLOWED_MANUAL_MIME_TYPES,
  MAX_MANUAL_FILE_SIZE_BYTES,
} from "../application/usecases/upload-manual";

/** フォームの file 欄を説明書 PDF として取り出す。画面に出せる日本語のエラーにする。 */
export function parseManualFile(data: FormData): File {
  const file = data.get("file");
  if (!(file instanceof File)) throw new Error("file is required");
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
  return file;
}
