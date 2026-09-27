import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { useState } from "react";

import type { MaintenanceTaskListItem } from "../../application/usecases/list-maintenance-tasks";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Manual } from "../../domain/manual/manual";
import { deleteMaintenanceTaskFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";
import { CompleteButton } from "./CompleteButton";
import { formatDate, formatInterval } from "./format";
import { LastDoneCell } from "./LastDoneCell";
import { MaintenanceTaskForm } from "./MaintenanceTaskForm";
import { SkipButton } from "./SkipButton";

export function MaintenanceTasksSection({
  productId,
  manuals,
  tasks,
}: {
  productId: string;
  manuals: Manual[];
  tasks: MaintenanceTaskListItem[];
}) {
  const [createOpened, createDisclosure] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={3}>メンテナンスタスク</Title>
        <Button onClick={createDisclosure.open}>タスクを追加</Button>
      </Group>
      {tasks.length === 0 ? (
        <Text c="dimmed">まだタスクが登録されていません。</Text>
      ) : (
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>タスク</Table.Th>
                <Table.Th>周期</Table.Th>
                <Table.Th>次回予定</Table.Th>
                <Table.Th>最終実施</Table.Th>
                <Table.Th>由来</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  manuals={manuals}
                  onEdit={() => {
                    setEditingTask(task);
                  }}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
      <Modal
        opened={createOpened}
        onClose={createDisclosure.close}
        title="メンテナンスタスクを追加"
      >
        <MaintenanceTaskForm mode="create" productId={productId} onDone={createDisclosure.close} />
      </Modal>
      <Modal
        opened={editingTask !== null}
        onClose={() => {
          setEditingTask(null);
        }}
        title="メンテナンスタスクを編集"
      >
        {editingTask && (
          <MaintenanceTaskForm
            mode="edit"
            productId={productId}
            task={editingTask}
            onDone={() => {
              setEditingTask(null);
            }}
          />
        )}
      </Modal>
    </Stack>
  );
}

function TaskRow({
  task,
  manuals,
  onEdit,
}: {
  task: MaintenanceTaskListItem;
  manuals: Manual[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const deleteTask = useServerFn(deleteMaintenanceTaskFn);
  const [deleting, setDeleting] = useState(false);
  const overdue =
    task.nextDueDate !== null &&
    dayjs(task.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"));
  const sourceManual =
    task.sourceManualId !== null ? manuals.find((m) => m.id === task.sourceManualId) : null;

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "タスクを削除",
      centered: true,
      children: <Text size="sm">「{task.title}」を削除します。履歴も全て削除されます。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteTask({ data: { taskId: task.id } });
          notifications.show({ color: "green", message: "タスクを削除しました" });
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "削除に失敗しました",
            message: errorMessage(e),
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <Table.Tr>
      <Table.Td>
        <Text>{task.title}</Text>
        {task.memo && (
          <Text size="xs" c="dimmed">
            {task.memo}
          </Text>
        )}
      </Table.Td>
      <Table.Td>{formatInterval(task.intervalValue, task.intervalUnit)}</Table.Td>
      <Table.Td>
        <Group gap={6} align="center">
          <Text size="sm">{formatDate(task.nextDueDate)}</Text>
          {overdue && (
            <Badge color="red" size="xs">
              期限超過
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <LastDoneCell task={task} />
      </Table.Td>
      <Table.Td>
        {task.source === "ai" ? (
          <Tooltip label={sourceManual?.fileName ?? "AI"}>
            <Badge variant="light">AI</Badge>
          </Tooltip>
        ) : (
          <Badge variant="default">手動</Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <CompleteButton taskId={task.id} />
          <SkipButton task={task} />
          <ActionIcon variant="default" onClick={onEdit} aria-label="編集">
            ✎
          </ActionIcon>
          <ActionIcon
            color="red"
            variant="subtle"
            loading={deleting}
            onClick={handleDelete}
            aria-label="削除"
          >
            ×
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
