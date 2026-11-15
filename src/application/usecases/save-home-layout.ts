import { BusinessRuleError } from "../../domain/errors";
import { parseHomeLayoutJson, type SavedHomeLayout } from "../../domain/home-map/home-layout";
import type { Deps } from "../deps";

/** 貼り付けた間取りの JSON を確かめて保存する。家族で 1 枚なので、前の間取りは置き換わる。 */
export async function saveHomeLayout(
  deps: Pick<Deps, "auth" | "clock" | "homeLayoutRepository">,
  input: { layoutJson: string },
): Promise<SavedHomeLayout> {
  const userId = await deps.auth.requireUserId();
  const parsed = parseHomeLayoutJson(input.layoutJson);
  if (!parsed.ok) {
    throw new BusinessRuleError(`間取りの JSON に誤りがあります: ${parsed.errors.join(" / ")}`);
  }
  const saved: SavedHomeLayout = { userId, layout: parsed.layout, updatedAt: deps.clock.now() };
  await deps.homeLayoutRepository.save(saved);
  return saved;
}
