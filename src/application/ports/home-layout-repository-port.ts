import type { SavedHomeLayout } from "../../domain/home-map/home-layout";

/** 間取りはユーザー ID (家族で共有) ごとに 1 件。 */
export type HomeLayoutRepositoryPort = {
  find(userId: string): Promise<SavedHomeLayout | null>;
  /** なければ作り、あれば置き換える */
  save(layout: SavedHomeLayout): Promise<void>;
};
