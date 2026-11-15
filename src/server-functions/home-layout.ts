import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getHomeLayout } from "../application/usecases/get-home-layout";
import { saveHomeLayout } from "../application/usecases/save-home-layout";
import { HOME_LAYOUT_LIMITS } from "../domain/home-map/home-layout";
import { getDeps } from "../infrastructure/deps";

// 中身の検証はドメインの parseHomeLayoutJson で行う
const SaveHomeLayoutSchema = z.object({
  layoutJson: z.string().max(HOME_LAYOUT_LIMITS.jsonLength + 100),
});

export const getHomeLayoutFn = createServerFn({ method: "GET" }).handler(async () => {
  return getHomeLayout(getDeps());
});

export const saveHomeLayoutFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => SaveHomeLayoutSchema.parse(data))
  .handler(async ({ data }) => {
    return saveHomeLayout(getDeps(), data);
  });
