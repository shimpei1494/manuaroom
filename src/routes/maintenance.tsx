import { Anchor, Badge, Group, Paper, Stack, Table, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCalendarMonth,
  IconCalendarOff,
  IconClockHour4,
  IconTool,
  type Icon,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import type { MaintenanceTaskListItem } from "../application/usecases/list-maintenance-tasks";
import { classifyByDueDate } from "../domain/maintenance/classify-by-due-date";
import type { Product } from "../domain/product/product";
import { CompleteButton } from "../features/maintenance/CompleteButton";
import { formatDate, formatInterval } from "../features/maintenance/format";
import { LastDoneCell } from "../features/maintenance/LastDoneCell";
import { SkipButton } from "../features/maintenance/SkipButton";
import { ProductAvatar } from "../features/product/ProductAvatar";
import { EmptyState } from "../features/shared/EmptyState";
import { PageHeader } from "../features/shared/PageHeader";
import { useToday } from "../features/shared/use-today";
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
  const today = useToday();

  const { overdue, thisWeek, nextMonth, later, noDate } = classifyByDueDate(tasks, today);

  return (
    <Stack gap="lg">
      <PageHeader icon={IconTool} title="メンテナンス" description="すべてのお手入れを期限順に" />
      {tasks.length === 0 && (
        <EmptyState icon={IconTool} title="まだタスクが登録されていません">
          <Anchor component={Link} to="/products">
            製品ページ
          </Anchor>
          から登録してください。
        </EmptyState>
      )}
      <Section
        title="期限超過"
        icon={IconAlertTriangle}
        color="red"
        tasks={overdue}
        productMap={productMap}
      />
      <Section
        title="今週"
        icon={IconCalendarDue}
        color="apricot"
        tasks={thisWeek}
        productMap={productMap}
      />
      <Section
        title="来月まで"
        icon={IconCalendarMonth}
        color="blue"
        tasks={nextMonth}
        productMap={productMap}
      />
      <Section
        title="それ以降"
        icon={IconClockHour4}
        color="gray"
        tasks={later}
        productMap={productMap}
      />
      <Section
        title="予定なし"
        icon={IconCalendarOff}
        color="gray"
        tasks={noDate}
        productMap={productMap}
      />
    </Stack>
  );
}

function Section({
  title,
  icon: SectionIcon,
  color,
  tasks,
  productMap,
}: {
  title: string;
  icon: Icon;
  color: string;
  tasks: MaintenanceTaskListItem[];
  productMap: Map<string, Product>;
}) {
  if (tasks.length === 0) return null;
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <ThemeIcon size={28} radius="xl" variant="light" color={color}>
          <SectionIcon size={16} stroke={1.8} />
        </ThemeIcon>
        <Title order={4}>{title}</Title>
        <Badge color={color} variant="light" circle>
          {tasks.length}
        </Badge>
      </Group>
      <Paper withBorder shadow="sm">
        {/* スマホでは列を潰さずに横スクロールさせる */}
        <Table.ScrollContainer minWidth={760}>
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
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
}

function Row({ task, product }: { task: MaintenanceTaskListItem; product: Product | undefined }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={600}>{task.title}</Text>
        {task.memo && (
          <Text size="xs" c="dimmed">
            {task.memo}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        {product ? (
          <Group gap={8} wrap="nowrap">
            <ProductAvatar product={product} size="md" />
            <Anchor
              renderRoot={(props) => (
                <Link to="/products/$productId" params={{ productId: product.id }} {...props} />
              )}
            >
              {product.name}
            </Anchor>
          </Group>
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
