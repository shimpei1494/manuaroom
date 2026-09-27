import { Anchor, Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link, createFileRoute } from "@tanstack/react-router";

import type { MaintenanceTaskListItem } from "../application/usecases/list-maintenance-tasks";
import {
  DUE_SOON_DAYS,
  findNextUpcoming,
  selectTasksToDoNow,
} from "../domain/maintenance/classify-by-due-date";
import type { Product } from "../domain/product/product";
import { CompleteButton } from "../features/maintenance/CompleteButton";
import { formatDate, formatDueLabel } from "../features/maintenance/format";
import { SkipButton } from "../features/maintenance/SkipButton";
import { listMaintenanceTasksFn } from "../server-functions/maintenance-tasks";
import { listProductsFn } from "../server-functions/products";

export const Route = createFileRoute("/")({
  // 「今日」はブラウザのタイムゾーンで決めたいので、データだけサーバーで取り、画面はブラウザで描く。
  // (Workers は UTC で動くため、サーバーで描くと日本時間の 0〜9 時に 1 日ずれる)
  ssr: "data-only",
  loader: async () => {
    const [tasks, products] = await Promise.all([
      listMaintenanceTasksFn({ data: {} }),
      listProductsFn(),
    ]);
    return { tasks, products };
  },
  component: HomePage,
});

function HomePage() {
  const { tasks, products } = Route.useLoaderData();
  const productMap = new Map(products.map((p) => [p.id, p] as const));
  const today = new Date();
  const todo = selectTasksToDoNow(tasks, today);
  const next = todo.length === 0 ? findNextUpcoming(tasks, today) : null;

  return (
    <Stack maw={640}>
      <Title order={2}>今やること</Title>
      <Text size="sm" c="dimmed">
        期限を過ぎたものと、{DUE_SOON_DAYS}日以内に期限が来るもの
      </Text>

      {todo.length === 0 ? (
        <Card withBorder padding="lg">
          <Text fw={700}>今やることはありません</Text>
          {next && (
            <Text size="sm" c="dimmed" mt={4}>
              次は {formatDate(next.nextDueDate)} {productMap.get(next.productId)?.name ?? ""}{" "}
              {next.title}
            </Text>
          )}
        </Card>
      ) : (
        todo.map((task) => (
          <TodoCard
            key={task.id}
            task={task}
            product={productMap.get(task.productId)}
            today={today}
          />
        ))
      )}

      <Group gap="lg">
        <Anchor component={Link} to="/maintenance">
          すべてのメンテナンス
        </Anchor>
        <Anchor component={Link} to="/products">
          製品一覧
        </Anchor>
      </Group>
    </Stack>
  );
}

function TodoCard({
  task,
  product,
  today,
}: {
  task: MaintenanceTaskListItem;
  product: Product | undefined;
  today: Date;
}) {
  const due = task.nextDueDate;
  const overdue = due !== null && formatDueLabel(due, today).endsWith("超過");
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Text size="sm" c="dimmed">
              {product ? (
                <Anchor
                  size="sm"
                  renderRoot={(props) => (
                    <Link to="/products/$productId" params={{ productId: product.id }} {...props} />
                  )}
                >
                  {product.name}
                </Anchor>
              ) : (
                "(削除済み)"
              )}
            </Text>
            <Text fw={700}>{task.title}</Text>
          </div>
          {due && (
            <Badge color={overdue ? "red" : "orange"} variant="light" style={{ flexShrink: 0 }}>
              {formatDueLabel(due, today)}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            期限 {formatDate(due)}
          </Text>
          {task.skipCount > 0 && (
            <Badge color="yellow" variant="light" size="xs">
              {task.skipCount}回スキップ中
            </Badge>
          )}
        </Group>
        <Group grow>
          <CompleteButton taskId={task.id} size="md" />
          <SkipButton task={task} size="md" />
        </Group>
      </Stack>
    </Card>
  );
}
