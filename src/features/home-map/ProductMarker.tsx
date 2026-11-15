import { Anchor, Group, Popover, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowsMove, IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useRef, useState, type CSSProperties } from "react";

import { productVisual } from "../product/product-visual";
import { ProductAvatar } from "../product/ProductAvatar";
import { toPercent, type ViewBox } from "./floor-plan-geometry";
import { describePlace, type PlacedProduct } from "./placed-products";

/**
 * 間取りの上の製品の点。PC ではカーソルを当てると、スマホではタップすると吹き出しが開く。
 * 吹き出しには、近くに置いた製品もまとめて並べる (点が重なっても選べるように)。
 */
export function ProductMarker({
  view,
  item,
  nearby,
  highlighted = false,
}: {
  view: ViewBox;
  item: PlacedProduct;
  /** 吹き出しに並べる製品 (item を先頭に、近くのものを含む) */
  nearby: PlacedProduct[];
  highlighted?: boolean;
}) {
  const [opened, setOpened] = useState(highlighted);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { icon: Icon, color } = productVisual(item.product);
  const canHover = () => window.matchMedia("(hover: hover)").matches;
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  // 点から吹き出しへカーソルを動かす間に閉じないよう、少し待ってから閉じる
  const scheduleClose = () => {
    if (!canHover()) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpened(false);
    }, 200);
  };
  const style = {
    ...toPercent(view, item),
    "--marker-color": `var(--mantine-color-${color}-filled)`,
  } as CSSProperties;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top"
      withArrow
      shadow="md"
      width={260}
      offset={6}
    >
      <Popover.Target>
        <UnstyledButton
          className="map-marker"
          style={style}
          data-highlighted={highlighted || undefined}
          aria-label={item.product.name}
          aria-expanded={opened}
          onMouseEnter={() => {
            if (!canHover()) return;
            cancelClose();
            setOpened(true);
          }}
          onMouseLeave={scheduleClose}
          onClick={() => {
            // カーソルを当てて開いた後のクリックで閉じないよう、PC では開くだけにする
            setOpened((o) => (canHover() ? true : !o));
          }}
        >
          <Icon size={14} stroke={2} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="xs" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
        <Stack gap={4}>
          {nearby.map((entry) => (
            <MarkerEntry key={entry.productId} entry={entry} />
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function MarkerEntry({ entry }: { entry: PlacedProduct }) {
  const place = describePlace(entry);
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <ProductAvatar product={entry.product} size="md" />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Anchor
          renderRoot={(props) => (
            <Link to="/products/$productId" params={{ productId: entry.productId }} {...props} />
          )}
          fw={700}
          size="sm"
          c="inherit"
          style={{ overflowWrap: "anywhere" }}
        >
          <Group gap={2} wrap="nowrap">
            {entry.product.name}
            <IconChevronRight size={14} />
          </Group>
        </Anchor>
        {place && (
          <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
            {place}
          </Text>
        )}
      </Stack>
      <Anchor
        renderRoot={(props) => <Link to="/map" search={{ place: entry.productId }} {...props} />}
        size="xs"
        aria-label={`${entry.product.name} の位置を直す`}
        title="位置を直す"
      >
        <IconArrowsMove size={18} />
      </Anchor>
    </Group>
  );
}
