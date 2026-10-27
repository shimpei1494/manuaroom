import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconChevronRight, IconMapPin, IconPackage, IconPlus } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import type { Product } from "../../domain/product/product";
import { ProductAvatar } from "../../features/product/ProductAvatar";
import { EmptyState } from "../../features/shared/EmptyState";
import { PageHeader } from "../../features/shared/PageHeader";
import { listProductsFn } from "../../server-functions/products";

export const Route = createFileRoute("/products/")({
  loader: () => listProductsFn(),
  component: ProductsPage,
});

function ProductsPage() {
  const products = Route.useLoaderData();
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconPackage}
        title="製品一覧"
        description={products.length > 0 ? `${products.length.toString()} 件の製品` : undefined}
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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" className="stagger">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </SimpleGrid>
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
