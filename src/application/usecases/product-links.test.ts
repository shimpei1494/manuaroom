import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError, NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeProduct, makeProductLink } from "../testing/fake-deps";
import { addProductLink } from "./add-product-link";
import { deleteProductLink } from "./delete-product-link";
import { listProductLinks } from "./list-product-links";
import { updateProductLink } from "./update-product-link";

describe("addProductLink", () => {
  test("製品にリンクを追加し、一覧に追加した順で出る", async () => {
    const deps = createFakeDeps({ now: new Date("2026-03-01T00:00:00Z") });
    const product = makeProduct();
    await deps.productRepository.create(product);

    const first = await addProductLink(deps, {
      productId: product.id,
      url: "https://example.com/support",
      title: "公式サポート",
      description: "エラーコードの一覧",
    });
    deps.setNow(new Date("2026-03-02T00:00:00Z"));
    const second = await addProductLink(deps, {
      productId: product.id,
      url: "https://www.example.com/parts",
    });

    expect(first).toMatchObject({
      productId: product.id,
      title: "公式サポート",
      description: "エラーコードの一覧",
      createdAt: new Date("2026-03-01T00:00:00Z"),
    });
    expect(second.title).toBe("example.com");
    const links = await listProductLinks(deps, { productId: product.id });
    expect(links.map((l) => l.id)).toEqual([first.id, second.id]);
  });

  test("他のユーザーの製品には追加できない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct({ userId: "someone-else" });
    await deps.productRepository.create(product);

    await expect(
      addProductLink(deps, { productId: product.id, url: "https://example.com" }),
    ).rejects.toThrow(NotFoundError);
  });

  test("http / https 以外の URL は保存しない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    await expect(
      addProductLink(deps, { productId: product.id, url: "javascript:alert(1)" }),
    ).rejects.toThrow(BusinessRuleError);
    expect(await listProductLinks(deps, { productId: product.id })).toEqual([]);
  });
});

describe("updateProductLink", () => {
  test("URL・タイトル・説明を書き換え、更新日時を進める", async () => {
    const deps = createFakeDeps({ now: new Date("2026-03-05T00:00:00Z") });
    const link = makeProductLink({ description: "古い説明" });
    await deps.productLinkRepository.create(link);

    const updated = await updateProductLink(deps, {
      linkId: link.id,
      url: "https://example.com/new",
      title: "新しいページ",
      description: "",
    });

    expect(updated).toMatchObject({
      url: "https://example.com/new",
      title: "新しいページ",
      description: null,
      createdAt: link.createdAt,
      updatedAt: new Date("2026-03-05T00:00:00Z"),
    });
    expect(
      await deps.productLinkRepository.findById({ userId: link.userId, linkId: link.id }),
    ).toEqual(updated);
  });

  test("他のユーザーのリンクは書き換えられない", async () => {
    const deps = createFakeDeps();
    const link = makeProductLink({ userId: "someone-else" });
    await deps.productLinkRepository.create(link);

    await expect(
      updateProductLink(deps, { linkId: link.id, url: "https://example.com" }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteProductLink", () => {
  test("自分のリンクだけを消す", async () => {
    const deps = createFakeDeps();
    const mine = makeProductLink();
    const others = makeProductLink({ userId: "someone-else" });
    await deps.productLinkRepository.create(mine);
    await deps.productLinkRepository.create(others);

    await deleteProductLink(deps, { linkId: mine.id });
    await deleteProductLink(deps, { linkId: others.id });

    expect(
      await deps.productLinkRepository.findById({ userId: mine.userId, linkId: mine.id }),
    ).toBeNull();
    expect(
      await deps.productLinkRepository.findById({ userId: "someone-else", linkId: others.id }),
    ).toEqual(others);
  });
});
