import type { Deps } from "../deps";

/** 製品を間取りから外す。置いていなければ何もしない。 */
export async function removeProductPlacement(
  deps: Pick<Deps, "auth" | "productPlacementRepository">,
  input: { productId: string },
): Promise<void> {
  const userId = await deps.auth.requireUserId();
  await deps.productPlacementRepository.delete({ userId, productId: input.productId });
}
