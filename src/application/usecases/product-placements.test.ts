import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError, NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeProduct } from "../testing/fake-deps";
import { getProductPlacement, listProductPlacements } from "./list-product-placements";
import { placeProductOnMap } from "./place-product-on-map";
import { removeProductPlacement } from "./remove-product-placement";
import { saveHomeLayout } from "./save-home-layout";

const NOW = new Date("2026-11-15T00:00:00Z");
const LAYOUT_JSON = JSON.stringify({
  version: 1,
  rooms: [{ id: "dk", name: "DK", type: "dining", rect: [0, 0, 360, 300] }],
});

async function setup() {
  const deps = createFakeDeps({ now: NOW });
  await saveHomeLayout(deps, { layoutJson: LAYOUT_JSON });
  const product = makeProduct({ name: "冷蔵庫" });
  await deps.productRepository.create(product);
  return { deps, product };
}

describe("製品を間取りに置く", () => {
  test("位置を cm に丸めて保存し、置き直すと位置が変わる (1 製品 1 か所)", async () => {
    const { deps, product } = await setup();

    await placeProductOnMap(deps, { productId: product.id, x: 100.4, y: 50.6 });
    const moved = await placeProductOnMap(deps, { productId: product.id, x: 200, y: 120 });

    expect(moved).toEqual({
      productId: product.id,
      userId: product.userId,
      x: 200,
      y: 120,
      updatedAt: NOW,
    });
    expect(await listProductPlacements(deps)).toEqual([moved]);
    expect(await getProductPlacement(deps, { productId: product.id })).toEqual(moved);
  });

  test("間取りを登録していなければ置けない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    await expect(placeProductOnMap(deps, { productId: product.id, x: 10, y: 10 })).rejects.toThrow(
      "先に「間取り設定」で間取りを登録してください",
    );
  });

  test("間取りの外や、ない製品には置けない", async () => {
    const { deps, product } = await setup();

    await expect(placeProductOnMap(deps, { productId: product.id, x: 500, y: 10 })).rejects.toThrow(
      BusinessRuleError,
    );
    await expect(placeProductOnMap(deps, { productId: "missing", x: 10, y: 10 })).rejects.toThrow(
      NotFoundError,
    );
    expect(await listProductPlacements(deps)).toEqual([]);
  });

  test("他のユーザーの製品は置けない", async () => {
    const { deps } = await setup();
    const others = makeProduct({ userId: "other-user" });
    await deps.productRepository.create(others);

    await expect(placeProductOnMap(deps, { productId: others.id, x: 10, y: 10 })).rejects.toThrow(
      NotFoundError,
    );
  });

  test("外すと一覧から消える", async () => {
    const { deps, product } = await setup();
    await placeProductOnMap(deps, { productId: product.id, x: 10, y: 10 });

    await removeProductPlacement(deps, { productId: product.id });

    expect(await listProductPlacements(deps)).toEqual([]);
    expect(await getProductPlacement(deps, { productId: product.id })).toBeNull();
  });
});
