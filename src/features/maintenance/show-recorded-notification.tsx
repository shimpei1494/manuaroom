import { Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { UndoLogButton } from "./UndoLogButton";

/** 完了・スキップを記録したことを知らせ、その場で取り消せるようにする。 */
export function showRecordedNotification(message: string, logId: string) {
  const id = notifications.show({
    color: "green",
    autoClose: 8000,
    message: (
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{message}</Text>
        <UndoLogButton
          logId={logId}
          onUndone={() => {
            notifications.hide(id);
          }}
        />
      </Group>
    ),
  });
}
