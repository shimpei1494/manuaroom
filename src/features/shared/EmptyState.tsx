import { Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** データがまだないときや、やることがないときの案内。 */
export function EmptyState({
  icon: IconComponent,
  color = "mint",
  title,
  children,
  action,
  compact = false,
}: {
  icon: Icon;
  color?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** ページの一部に置くときの、小さめの見た目 */
  compact?: boolean;
}) {
  return (
    <Paper withBorder p={compact ? "md" : "xl"}>
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon
          size={compact ? 44 : 64}
          radius="xl"
          variant="light"
          color={color}
          className="float"
        >
          <IconComponent size={compact ? 24 : 34} stroke={1.5} />
        </ThemeIcon>
        <Text fw={700} size={compact ? "md" : "lg"} mt={compact ? 0 : "xs"}>
          {title}
        </Text>
        {children && (
          <Text size="sm" c="dimmed" maw={420}>
            {children}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}
