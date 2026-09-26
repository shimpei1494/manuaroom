import type { Manual } from "../../domain/manual/manual";
import type { Deps } from "../deps";

export async function listManuals(
  deps: Pick<Deps, "auth" | "manualRepository">,
  productId: string,
): Promise<Manual[]> {
  const userId = await deps.auth.requireUserId();
  return deps.manualRepository.listByProduct({ userId, productId });
}
