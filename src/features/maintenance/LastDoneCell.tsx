import { Badge, Stack, Text } from "@mantine/core";

import type { MaintenanceTaskListItem } from "../../application/usecases/list-maintenance-tasks";
import { formatLastDone } from "./format-last-done";

/** 最終実施日と、そこから何回続けてスキップしているか (ADR 0006)。 */
export function LastDoneCell({ task }: { task: MaintenanceTaskListItem }) {
  return (
    <Stack gap={2} align="flex-start">
      {/* この部品を使う画面はブラウザで描く (ssr: "data-only") が、念のためブラウザ側の表示を正とする */}
      <Text size="sm" suppressHydrationWarning>
        {formatLastDone(task.lastDoneAt, new Date())}
      </Text>
      {task.skipCount > 0 && (
        <Badge color="yellow" variant="light" size="xs">
          {task.skipCount}回スキップ中
        </Badge>
      )}
    </Stack>
  );
}
