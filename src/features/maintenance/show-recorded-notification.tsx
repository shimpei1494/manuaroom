import { Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { UndoLogButton } from "./UndoLogButton";

/** 完了・スキップを記録したことを知らせ、その場で取り消せるようにする (まとめてスキップは複数の記録)。 */
export function showRecordedNotification(message: string, logIds: string | readonly string[]) {
  const id = notifications.show({
    color: "green",
    autoClose: 8000,
    message: (
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{message}</Text>
        <UndoLogButton
          logIds={typeof logIds === "string" ? [logIds] : logIds}
          onUndone={() => {
            notifications.hide(id);
          }}
        />
      </Group>
    ),
  });
}
