import { Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** 各ページの見出し。アイコン・タイトル・ひとこと説明と、右側の操作ボタン。 */
export function PageHeader({
  icon: IconComponent,
  title,
  description,
  actions,
}: {
  icon: Icon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon
          size={44}
          radius="xl"
          variant="gradient"
          gradient={{ from: "mint.5", to: "teal.7", deg: 135 }}
        >
          <IconComponent size={24} stroke={1.8} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
      </Group>
      {actions}
    </Group>
  );
}
