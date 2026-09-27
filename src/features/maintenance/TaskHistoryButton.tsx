import { ActionIcon, Badge, Group, Loader, Modal, Stack, Table, Text } from "@mantine/core";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { MaintenanceLogListItem } from "../../application/usecases/list-maintenance-logs";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { listMaintenanceLogsFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";
import { formatDate } from "./format";
import { UndoLogButton } from "./UndoLogButton";

/** タスクの実施・スキップの履歴をダイアログで見せる。最後の記録はここから取り消せる。 */
export function TaskHistoryButton({ task }: { task: MaintenanceTask }) {
  const listLogs = useServerFn(listMaintenanceLogsFn);
  const [opened, setOpened] = useState(false);
  const [logs, setLogs] = useState<MaintenanceLogListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      setLogs(await listLogs({ data: { taskId: task.id } }));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      <ActionIcon
        variant="default"
        aria-label="履歴"
        onClick={() => {
          setOpened(true);
          setLogs(null);
          void load();
        }}
      >
        ⏱
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
        }}
        title={`履歴: ${task.title}`}
      >
        {error !== null ? (
          <Text c="red">{error}</Text>
        ) : logs === null ? (
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        ) : logs.length === 0 ? (
          <Text c="dimmed">まだ記録がありません。</Text>
        ) : (
          <Stack gap="xs">
            <Table>
              <Table.Tbody>
                {logs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{formatDate(log.doneAt)}</Table.Td>
                    <Table.Td>
                      {log.kind === "done" ? (
                        <Badge color="green" variant="light">
                          実施
                        </Badge>
                      ) : (
                        <Badge color="yellow" variant="light">
                          スキップ
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{log.memo ?? ""}</Text>
                    </Table.Td>
                    <Table.Td>
                      {log.canUndo && <UndoLogButton logId={log.id} onUndone={() => void load()} />}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed">
              取り消せるのは最後の記録だけです。
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
}
