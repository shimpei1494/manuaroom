import { Group, ThemeIcon, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** ページ内の区切りの見出し。 */
export function SectionTitle({
  icon: IconComponent,
  color = "mint",
  children,
}: {
  icon: Icon;
  color?: string;
  children: ReactNode;
}) {
  return (
    <Group gap={8} wrap="nowrap">
      <ThemeIcon size={30} radius="xl" variant="light" color={color}>
        <IconComponent size={18} stroke={1.8} />
      </ThemeIcon>
      <Title order={3}>{children}</Title>
    </Group>
  );
}
