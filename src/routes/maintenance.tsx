import { Anchor, Badge, Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { useState } from "react";

import type { MaintenanceTask } from "../domain/maintenance/maintenance-task";
import { INTERVAL_UNIT_VALUES } from "../domain/maintenance/maintenance-task";
import type { Product } from "../domain/product/product";
import {
  listMaintenanceTasksFn,
  markMaintenanceDoneFn,
} from "../server-functions/maintenance-tasks";
import { listProductsFn } from "../server-functions/products";

export const Route = createFileRoute("/maintenance")({
  loader: async () => {
    const [tasks, products] = await Promise.all([
      listMaintenanceTasksFn({ data: {} }),
      listProductsFn(),
    ]);
    return { tasks, products };
  },
  component: MaintenancePage,
});

function MaintenancePage() {
  const { tasks, products } = Route.useLoaderData();
  const productMap = new Map(products.map((p) => [p.id, p] as const));

  const today = dayjs().startOf("day");
  const overdue: MaintenanceTask[] = [];
  const thisWeek: MaintenanceTask[] = [];
  const nextMonth: MaintenanceTask[] = [];
  const later: MaintenanceTask[] = [];
  const noDate: MaintenanceTask[] = [];

  const weekLimit = today.add(7, "day");
  const monthLimit = today.add(30, "day");

  for (const task of tasks) {
    if (task.nextDueDate === null) {
      noDate.push(task);
      continue;
    }
    const due = dayjs(task.nextDueDate).startOf("day");
    if (due.isBefore(today)) overdue.push(task);
    else if (due.isBefore(weekLimit)) thisWeek.push(task);
    else if (due.isBefore(monthLimit)) nextMonth.push(task);
    else later.push(task);
  }

  return (
    <Stack>
      <Title order={2}>メンテナンス</Title>
      {tasks.length === 0 && (
        <Text c="dimmed">
          まだタスクが登録されていません。
          <Anchor component={Link} to="/products" ml={4}>
            製品ページ
          </Anchor>
          から登録してください。
        </Text>
      )}
      <Section title="期限超過" color="red" tasks={overdue} productMap={productMap} />
      <Section title="今週" color="orange" tasks={thisWeek} productMap={productMap} />
      <Section title="来月まで" color="blue" tasks={nextMonth} productMap={productMap} />
      <Section title="それ以降" color="gray" tasks={later} productMap={productMap} />
      <Section title="予定なし" color="gray" tasks={noDate} productMap={productMap} />
    </Stack>
  );
}

function Section({
  title,
  color,
  tasks,
  productMap,
}: {
  title: string;
  color: string;
  tasks: MaintenanceTask[];
  productMap: Map<string, Product>;
}) {
  if (tasks.length === 0) return null;
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Title order={4}>{title}</Title>
        <Badge color={color}>{tasks.length}</Badge>
      </Group>
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>タスク</Table.Th>
              <Table.Th>製品</Table.Th>
              <Table.Th>次回予定</Table.Th>
              <Table.Th>周期</Table.Th>
              <Table.Th>最終実施</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tasks.map((task) => (
              <Row key={task.id} task={task} product={productMap.get(task.productId)} />
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

function Row({ task, product }: { task: MaintenanceTask; product: Product | undefined }) {
  const router = useRouter();
  const markDone = useServerFn(markMaintenanceDoneFn);
  const [busy, setBusy] = useState(false);
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
      <Table.Td>
        {product ? (
          <Anchor
            renderRoot={(props) => (
              <Link to="/products/$productId" params={{ productId: product.id }} {...props} />
            )}
          >
            {product.name}
          </Anchor>
        ) : (
          <Text c="dimmed">(削除済み)</Text>
        )}
      </Table.Td>
      <Table.Td>{formatDate(task.nextDueDate)}</Table.Td>
      <Table.Td>{formatInterval(task.intervalValue, task.intervalUnit)}</Table.Td>
      <Table.Td>{formatDate(task.lastDoneAt)}</Table.Td>
      <Table.Td>
        <Button
          size="xs"
          variant="light"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await markDone({ data: { taskId: task.id } });
              notifications.show({ color: "green", message: "完了を記録しました" });
              await router.invalidate();
            } catch (e) {
              notifications.show({
                color: "red",
                title: "完了に失敗しました",
                message: e instanceof Error ? e.message : String(e),
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          完了
        </Button>
      </Table.Td>
    </Table.Tr>
  );
}

const INTERVAL_UNIT_LABELS: Record<(typeof INTERVAL_UNIT_VALUES)[number], string> = {
  day: "日",
  week: "週",
  month: "月",
  year: "年",
};

function formatInterval(
  value: number | null,
  unit: (typeof INTERVAL_UNIT_VALUES)[number] | null,
): string {
  if (value === null || unit === null) return "—";
  return `${value.toString()}${INTERVAL_UNIT_LABELS[unit]}ごと`;
}

function formatDate(value: Date | null): string {
  if (value === null) return "—";
  return dayjs(value).format("YYYY/MM/DD");
}
