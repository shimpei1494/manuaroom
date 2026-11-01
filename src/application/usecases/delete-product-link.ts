import type { Deps } from "../deps";

export async function deleteProductLink(
  deps: Pick<Deps, "auth" | "productLinkRepository">,
  input: { linkId: string },
): Promise<void> {
  const userId = await deps.auth.requireUserId();
  await deps.productLinkRepository.delete({ userId, linkId: input.linkId });
}
