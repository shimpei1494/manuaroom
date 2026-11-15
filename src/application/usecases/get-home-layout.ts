import type { SavedHomeLayout } from "../../domain/home-map/home-layout";
import type { Deps } from "../deps";

/** 家族で共有している間取り。まだ登録していなければ null。 */
export async function getHomeLayout(
  deps: Pick<Deps, "auth" | "homeLayoutRepository">,
): Promise<SavedHomeLayout | null> {
  const userId = await deps.auth.requireUserId();
  return deps.homeLayoutRepository.find(userId);
}
