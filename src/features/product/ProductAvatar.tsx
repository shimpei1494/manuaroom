import { ThemeIcon, type ThemeIconProps } from "@mantine/core";

import { productVisual } from "./product-visual";

/** 製品の種類がひと目でわかる、色付きの丸いアイコン。 */
export function ProductAvatar({
  product,
  size = "lg",
}: {
  product: { name: string; category: string | null } | undefined;
  size?: ThemeIconProps["size"];
}) {
  const { icon: Icon, color } = productVisual(product ?? { name: "", category: null });
  return (
    <ThemeIcon size={size} radius="xl" variant="light" color={product ? color : "gray"}>
      <Icon style={{ width: "60%", height: "60%" }} stroke={1.7} />
    </ThemeIcon>
  );
}
