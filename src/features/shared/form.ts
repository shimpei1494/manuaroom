/** 前後の空白を除き、空なら null にする (任意入力のテキスト欄用)。 */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** 通知に出すエラーメッセージ。 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
