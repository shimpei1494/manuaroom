import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconMapPinOff } from "@tabler/icons-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type CSSProperties } from "react";

import type { HomeLayout, Point } from "../../domain/home-map/home-layout";
import { clampToLayout } from "../../domain/home-map/product-placement";
import type { Product } from "../../domain/product/product";
import {
  placeProductOnMapFn,
  removeProductPlacementFn,
} from "../../server-functions/product-placements";
import { productVisual } from "../product/product-visual";
import { ProductAvatar } from "../product/ProductAvatar";
import { errorMessage } from "../shared/form";
import { clientToLayout, toPercent, type ViewBox } from "./floor-plan-geometry";
import { FloorPlan } from "./FloorPlan";
import type { PlacedProduct } from "./placed-products";

/** 矢印キー 1 回で動かす距離 (cm) */
const KEY_STEP = 10;

/** 製品を置く位置を選ぶ。図を押すと点を仮に置き、ドラッグ (または矢印キー) で動かして保存する。 */
export function PlacementEditor({
  layout,
  product,
  current,
  others,
}: {
  layout: HomeLayout;
  product: Product;
  /** すでに置いてある位置 (置き直すとき) */
  current: Point | null;
  /** ほかの製品の点 (目安として薄く出す) */
  others: PlacedProduct[];
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const place = useServerFn(placeProductOnMapFn);
  const remove = useServerFn(removeProductPlacementFn);
  // 呼び出し側が、製品や置いてある位置が変わったら key で作り直す
  // oxlint-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState<Point | null>(current && clampToLayout(layout, current));
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const { icon: Icon, color } = productVisual(product);

  const move = (point: Point) => {
    setDraft(clampToLayout(layout, point));
  };

  const handleSave = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await place({ data: { productId: product.id, x: draft.x, y: draft.y } });
      notifications.show({ color: "green", message: `「${product.name}」を間取りに置きました` });
      await navigate({ to: "/map", search: { product: product.id } });
      await router.invalidate();
    } catch (e) {
      notifications.show({ color: "red", title: "保存に失敗しました", message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await remove({ data: { productId: product.id } });
      notifications.show({ color: "green", message: `「${product.name}」を間取りから外しました` });
      await navigate({ to: "/products/$productId", params: { productId: product.id } });
    } catch (e) {
      notifications.show({ color: "red", title: "外せませんでした", message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const markerStyle = (view: ViewBox, point: Point, markerColor: string) =>
    ({
      ...toPercent(view, point),
      "--marker-color": `var(--mantine-color-${markerColor}-filled)`,
    }) as CSSProperties;

  return (
    <Stack gap="md">
      <Paper
        withBorder
        p="md"
        className="accent-left"
        style={{ "--accent-color": "var(--mantine-color-apricot-5)" } as CSSProperties}
      >
        <Group gap="sm" wrap="nowrap">
          <ProductAvatar product={product} size="lg" />
          <Stack gap={0}>
            <Text fw={700}>「{product.name}」を置く</Text>
            <Text size="sm" c="dimmed">
              {draft
                ? "点をドラッグして位置を調整し、保存してください。"
                : "間取りの、製品がある場所を押してください。"}
            </Text>
          </Stack>
        </Group>
      </Paper>
      <Paper withBorder p={{ base: "xs", sm: "md" }}>
        <FloorPlan layout={layout} onPlanClick={move}>
          {(view) => (
            <>
              {others.map((item) => (
                <span
                  key={item.productId}
                  className="map-marker"
                  data-muted
                  style={markerStyle(view, item, productVisual(item.product).color)}
                />
              ))}
              {draft && (
                <button
                  type="button"
                  className="map-marker"
                  data-draft
                  data-dragging={dragging || undefined}
                  style={markerStyle(view, draft, color)}
                  aria-label={`${product.name} の位置 (矢印キーで動かす)`}
                  onClick={(e) => {
                    // 図を押したときの「ここに置く」が動かないように
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragging(true);
                  }}
                  onPointerMove={(e) => {
                    if (!dragging) return;
                    const plan = e.currentTarget.closest(".floor-plan");
                    if (!plan) return;
                    move(
                      clientToLayout(view, plan.getBoundingClientRect(), {
                        x: e.clientX,
                        y: e.clientY,
                      }),
                    );
                  }}
                  onPointerUp={() => {
                    setDragging(false);
                  }}
                  onPointerCancel={() => {
                    setDragging(false);
                  }}
                  onKeyDown={(e) => {
                    const delta: Record<string, Point> = {
                      ArrowLeft: { x: -KEY_STEP, y: 0 },
                      ArrowRight: { x: KEY_STEP, y: 0 },
                      ArrowUp: { x: 0, y: -KEY_STEP },
                      ArrowDown: { x: 0, y: KEY_STEP },
                    };
                    const d = delta[e.key];
                    if (!d) return;
                    e.preventDefault();
                    move({ x: draft.x + d.x, y: draft.y + d.y });
                  }}
                >
                  <Icon size={16} stroke={2} />
                </button>
              )}
            </>
          )}
        </FloorPlan>
      </Paper>
      <Group justify="space-between">
        {current ? (
          <Button
            variant="light"
            color="red"
            loading={busy}
            onClick={() => void handleRemove()}
            leftSection={<IconMapPinOff size={18} />}
          >
            間取りから外す
          </Button>
        ) : (
          <span />
        )}
        <Group gap="xs">
          <Button
            variant="default"
            renderRoot={(props) => (
              <Link to="/products/$productId" params={{ productId: product.id }} {...props} />
            )}
          >
            キャンセル
          </Button>
          <Button
            onClick={() => void handleSave()}
            loading={busy}
            disabled={!draft}
            leftSection={<IconDeviceFloppy size={18} />}
          >
            保存
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
