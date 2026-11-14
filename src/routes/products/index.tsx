import {
  Badge,
  Button,
  Card,
  CloseButton,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconChevronRight,
  IconMapPin,
  IconPackage,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import type { Product } from "../../domain/product/product";
import { filterProductsByQuery } from "../../domain/product/product-search";
import { ProductAvatar } from "../../features/product/ProductAvatar";
import { EmptyState } from "../../features/shared/EmptyState";
import { PageHeader } from "../../features/shared/PageHeader";
import { listProductsFn } from "../../server-functions/products";

export const Route = createFileRoute("/products/")({
  // 検索語を URL に持たせ、製品詳細から戻ったときも絞り込みを保つ
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q !== "" ? { q: search.q } : {},
  loader: () => listProductsFn(),
  component: ProductsPage,
});

function ProductsPage() {
  const products = Route.useLoaderData();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // 入力中のカーソル位置が飛ばないよう、入力欄は手元の状態で持ち、URL へは置き換えで反映する
  const [query, setQuery] = useState(q);
  // 下のタブなどから検索語なしの /products に移ったときは入力欄も空にする
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (q === "") setQuery("");
  }
  const changeQuery = (value: string) => {
    setQuery(value);
    void navigate({ search: value === "" ? {} : { q: value }, replace: true });
  };
  const filtered = filterProductsByQuery(products, query);
  const isFiltering = query.trim() !== "";
  const description =
    products.length === 0
      ? undefined
      : isFiltering
        ? `${products.length.toString()} 件中 ${filtered.length.toString()} 件`
        : `${products.length.toString()} 件の製品`;

  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconPackage}
        title="製品一覧"
        description={description}
        actions={
          <Button component={Link} to="/products/new" leftSection={<IconPlus size={18} />}>
            新規登録
          </Button>
        }
      />
      {products.length === 0 ? (
        <EmptyState icon={IconPackage} title="まだ製品が登録されていません">
          「新規登録」から最初の製品を追加してください。説明書の PDF から登録することもできます。
        </EmptyState>
      ) : (
        <>
          <TextInput
            type="search"
            aria-label="製品を検索"
            placeholder="製品名・メーカー・型番・カテゴリ・場所で検索"
            leftSection={<IconSearch size={18} />}
            rightSection={
              query !== "" && (
                <CloseButton
                  aria-label="検索語を消す"
                  onClick={() => {
                    changeQuery("");
                  }}
                />
              )
            }
            value={query}
            onChange={(event) => {
              changeQuery(event.currentTarget.value);
            }}
          />
          {filtered.length === 0 ? (
            <EmptyState
              icon={IconSearch}
              color="gray"
              title="一致する製品はありません"
              action={
                <Button
                  variant="light"
                  onClick={() => {
                    changeQuery("");
                  }}
                >
                  検索をクリア
                </Button>
              }
            >
              「{query.trim()}」を含む製品は見つかりませんでした。別のことばで試してください。
            </EmptyState>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" className="stagger">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}

function ProductCard({ product }: { product: Product }) {
  const sub = [product.manufacturer, product.modelNumber].filter(Boolean).join(" ・ ");
  return (
    <Card
      padding="md"
      className="lift card-link"
      renderRoot={(props) => (
        <Link to="/products/$productId" params={{ productId: product.id }} {...props} />
      )}
    >
      <Group wrap="nowrap" gap="md">
        <ProductAvatar product={product} size={52} />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} truncate>
            {product.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {sub || "メーカー・型番は未入力"}
          </Text>
          {(product.category || product.location) && (
            <Group gap={6}>
              {product.category && (
                <Badge variant="light" color="gray" size="sm">
                  {product.category}
                </Badge>
              )}
              {product.location && (
                <Badge
                  variant="light"
                  color="mint"
                  size="sm"
                  leftSection={<IconMapPin size={11} />}
                >
                  {product.location}
                </Badge>
              )}
            </Group>
          )}
        </Stack>
        <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
      </Group>
    </Card>
  );
}
