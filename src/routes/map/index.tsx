import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconMap2, IconPlus, IconSettings } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { placementsNear } from "../../domain/home-map/product-placement";
import { FloorPlan } from "../../features/home-map/FloorPlan";
import { toPlacedProducts } from "../../features/home-map/placed-products";
import { PlacementEditor } from "../../features/home-map/PlacementEditor";
import { ProductMarker } from "../../features/home-map/ProductMarker";
import { ProductAvatar } from "../../features/product/ProductAvatar";
import { EmptyState } from "../../features/shared/EmptyState";
import { PageHeader } from "../../features/shared/PageHeader";
import { SectionTitle } from "../../features/shared/SectionTitle";
import { getHomeLayoutFn } from "../../server-functions/home-layout";
import { listProductPlacementsFn } from "../../server-functions/product-placements";
import { listProductsFn } from "../../server-functions/products";

type MapSearch = {
  /** この製品を置く位置を選ぶ */
  place?: string;
  /** この製品の点を目立たせ、吹き出しを開いておく */
  product?: string;
};

export const Route = createFileRoute("/map/")({
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    ...(typeof search.place === "string" && search.place !== "" ? { place: search.place } : {}),
    ...(typeof search.product === "string" && search.product !== ""
      ? { product: search.product }
      : {}),
  }),
  loader: async () => {
    const [saved, placements, products] = await Promise.all([
      getHomeLayoutFn(),
      listProductPlacementsFn(),
      listProductsFn(),
    ]);
    return { saved, placements, products };
  },
  component: MapPage,
});

function MapPage() {
  const { saved, placements, products } = Route.useLoaderData();
  const { place, product: highlightedId } = Route.useSearch();

  if (!saved) {
    return (
      <Stack gap="lg">
        <PageHeader icon={IconMap2} title="間取り" />
        <EmptyState
          icon={IconMap2}
          title="まだ間取りが登録されていません"
          action={
            <Button component={Link} to="/map/settings" mt="xs">
              間取りを登録する
            </Button>
          }
        >
          間取り図の画像を AI に渡して JSON を作ってもらい、「間取り設定」に貼り付けて登録します。
          家族みんなで同じ間取りを使います。
        </EmptyState>
      </Stack>
    );
  }

  const placed = toPlacedProducts(saved.layout, placements, products);
  const placing = place ? products.find((p) => p.id === place) : undefined;
  if (placing) {
    const current = placed.find((item) => item.productId === placing.id);
    return (
      <Stack gap="lg">
        <PageHeader icon={IconMap2} title="間取りに置く" description={saved.layout.name} />
        <PlacementEditor
          // 別の製品に切り替えたときや、置いてある位置が変わったときは、仮置きの点を作り直す
          key={`${placing.id}-${current ? `${current.x.toString()},${current.y.toString()}` : "none"}`}
          layout={saved.layout}
          product={placing}
          current={current ? { x: current.x, y: current.y } : null}
          others={placed.filter((item) => item.productId !== placing.id)}
        />
      </Stack>
    );
  }

  const placedIds = new Set(placed.map((item) => item.productId));
  const unplaced = products.filter((p) => !placedIds.has(p.id));
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconMap2}
        title="間取り"
        description={saved.layout.name}
        actions={
          <Button
            component={Link}
            to="/map/settings"
            variant="default"
            leftSection={<IconSettings size={18} />}
          >
            間取り設定
          </Button>
        }
      />
      <Paper withBorder p={{ base: "xs", sm: "md" }}>
        <FloorPlan layout={saved.layout}>
          {(view) =>
            placed.map((item) => (
              <ProductMarker
                // 目立たせる製品が変わったら、吹き出しの開き方を作り直す
                key={`${item.productId}-${String(item.productId === highlightedId)}`}
                view={view}
                item={item}
                // スマホでは点の大きさが図の幅の 8% ほどになり、それより近い点は重なるので、吹き出しにまとめて並べる
                nearby={placementsNear(placed, item, view.width * 0.08)}
                highlighted={item.productId === highlightedId}
              />
            ))
          }
        </FloorPlan>
      </Paper>
      {unplaced.length > 0 && (
        <Stack gap="sm">
          <SectionTitle icon={IconPlus}>まだ置いていない製品</SectionTitle>
          <Text size="sm" c="dimmed">
            押すと、間取りに置く画面になります。
          </Text>
          <Group gap="xs">
            {unplaced.map((product) => (
              <Button
                key={product.id}
                renderRoot={(props) => <Link to="/map" search={{ place: product.id }} {...props} />}
                variant="default"
                radius="xl"
                size="sm"
                leftSection={<ProductAvatar product={product} size="sm" />}
              >
                {product.name}
              </Button>
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
