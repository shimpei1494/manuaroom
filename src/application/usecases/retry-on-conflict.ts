import { BusinessRuleError } from "../../domain/errors";

const MAX_ATTEMPTS = 5;

/**
 * 他の操作と重なって書けなかったとき (attempt が null を返す) は、読み直すところからやり直す。
 * 書けなかったということは、別の操作が書けたということなので、数回やり直せば順番が回ってくる (ADR 0009)。
 */
export async function retryOnConflict<T>(
  attempt: () => Promise<T | null>,
  remaining = MAX_ATTEMPTS,
): Promise<T> {
  const result = await attempt();
  if (result !== null) return result;
  if (remaining <= 1) {
    throw new BusinessRuleError("ほかの操作と重なって記録できませんでした。もう一度お試しください");
  }
  return retryOnConflict(attempt, remaining - 1);
}
