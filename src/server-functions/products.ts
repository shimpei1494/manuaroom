import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createProduct } from "../application/usecases/create-product";
import { deleteProduct } from "../application/usecases/delete-product";
import { getProduct } from "../application/usecases/get-product";
import { listProducts } from "../application/usecases/list-products";
import { updateProduct } from "../application/usecases/update-product";
import { getDeps } from "../infrastructure/deps";

const ProductFieldsSchema = z.object({
  name: z.string().min(1, "製品名は必須です"),
  manufacturer: z.string().nullish(),
  modelNumber: z.string().nullish(),
  category: z.string().nullish(),
  location: z.string().nullish(),
  purchaseDate: z.coerce.date().nullish(),
  warrantyUntil: z.coerce.date().nullish(),
  memo: z.string().nullish(),
});

const UpdateProductInputSchema = ProductFieldsSchema.extend({
  productId: z.string().min(1),
});

const ProductIdSchema = z.object({ productId: z.string().min(1) });

export const listProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listProducts(getDeps());
});

export const getProductFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    return getProduct(getDeps(), data.productId);
  });

export const createProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ProductFieldsSchema.parse(data))
  .handler(async ({ data }) => {
    return createProduct(getDeps(), data);
  });

export const updateProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateProductInputSchema.parse(data))
  .handler(async ({ data }) => {
    return updateProduct(getDeps(), data);
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ProductIdSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteProduct(getDeps(), data.productId);
  });
