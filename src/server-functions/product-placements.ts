import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getProductPlacement,
  listProductPlacements,
} from "../application/usecases/list-product-placements";
import { placeProductOnMap } from "../application/usecases/place-product-on-map";
import { removeProductPlacement } from "../application/usecases/remove-product-placement";
import { getDeps } from "../infrastructure/deps";

const ProductIdSchema = z.object({ productId: z.string().min(1) });
// 間取りの範囲に入っているかはドメインの normalizePlacementPoint で確かめる
const PlaceSchema = ProductIdSchema.extend({ x: z.number(), y: z.number() });

export const listProductPlacementsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listProductPlacements(getDeps());
});

export const getProductPlacementFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    return getProductPlacement(getDeps(), data);
  });

export const placeProductOnMapFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => PlaceSchema.parse(data))
  .handler(async ({ data }) => {
    return placeProductOnMap(getDeps(), data);
  });

export const removeProductPlacementFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    await removeProductPlacement(getDeps(), data);
  });
