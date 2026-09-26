import type { Manual } from "../../domain/manual/manual";
import type { Deps } from "../../infrastructure/deps";

export async function listManuals(deps: Deps, productId: string): Promise<Manual[]> {
  const userId = await deps.auth.requireUserId();
  return deps.manualRepository.listByProduct({ userId, productId });
}
