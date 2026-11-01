import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { addProductLink } from "../application/usecases/add-product-link";
import { deleteProductLink } from "../application/usecases/delete-product-link";
import { listProductLinks } from "../application/usecases/list-product-links";
import { updateProductLink } from "../application/usecases/update-product-link";
import { PRODUCT_LINK_LIMITS } from "../domain/product/product-link";
import { getDeps } from "../infrastructure/deps";

// 細かい形式チェック (http/https のみ等) はドメインの normalizeProductLinkFields で行う
const LinkFieldsSchema = z.object({
  url: z
    .string()
    .min(1, "URL は必須です")
    .max(PRODUCT_LINK_LIMITS.url + 100),
  title: z
    .string()
    .max(PRODUCT_LINK_LIMITS.title + 100)
    .nullish(),
  description: z
    .string()
    .max(PRODUCT_LINK_LIMITS.description + 100)
    .nullish(),
});

const ProductIdSchema = z.object({ productId: z.string().min(1) });
const LinkIdSchema = z.object({ linkId: z.string().min(1) });

export const listProductLinksFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    return listProductLinks(getDeps(), data);
  });

export const addProductLinkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => LinkFieldsSchema.extend(ProductIdSchema.shape).parse(data))
  .handler(async ({ data }) => {
    return addProductLink(getDeps(), data);
  });

export const updateProductLinkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => LinkFieldsSchema.extend(LinkIdSchema.shape).parse(data))
  .handler(async ({ data }) => {
    return updateProductLink(getDeps(), data);
  });

export const deleteProductLinkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => LinkIdSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteProductLink(getDeps(), data);
  });
