import { Anchor, Badge, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { Link, createFileRoute } from "@tanstack/react-router";

import type { MaintenanceTaskListItem } from "../application/usecases/list-maintenance-tasks";
import { classifyByDueDate } from "../domain/maintenance/classify-by-due-date";
import type { Product } from "../domain/product/product";
import { CompleteButton } from "../features/maintenance/CompleteButton";
import { formatDate, formatInterval } from "../features/maintenance/format";
import { LastDoneCell } from "../features/maintenance/LastDoneCell";
import { SkipButton } from "../features/maintenance/SkipButton";
import { listMaintenanceTasksFn } from "../server-functions/maintenance-tasks";
import { listProductsFn } from "../server-functions/products";

export const Route = createFileRoute("/maintenance")({
  // 日付をブラウザのタイムゾーンで描くため (トップページと同じ理由)
  ssr: "data-only",
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

  const { overdue, thisWeek, nextMonth, later, noDate } = classifyByDueDate(tasks, new Date());

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
  tasks: MaintenanceTaskListItem[];
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

function Row({ task, product }: { task: MaintenanceTaskListItem; product: Product | undefined }) {
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
      <Table.Td>
        <LastDoneCell task={task} />
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <CompleteButton taskId={task.id} />
          <SkipButton task={task} />
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
