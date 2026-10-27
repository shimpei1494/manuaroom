import { Anchor, Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconCalendarEvent,
  IconChecklist,
  IconConfetti,
  IconPackage,
  IconPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";

import type { MaintenanceTaskListItem } from "../application/usecases/list-maintenance-tasks";
import {
  DUE_SOON_DAYS,
  classifyByDueDate,
  findNextUpcoming,
  selectTasksToDoNow,
} from "../domain/maintenance/classify-by-due-date";
import type { Product } from "../domain/product/product";
import { CompleteButton } from "../features/maintenance/CompleteButton";
import { formatDate, formatDueLabel } from "../features/maintenance/format";
import { SkipButton } from "../features/maintenance/SkipButton";
import { ProductAvatar } from "../features/product/ProductAvatar";
import { EmptyState } from "../features/shared/EmptyState";
import { greeting } from "../features/shared/greeting";
import { SectionTitle } from "../features/shared/SectionTitle";
import { useToday } from "../features/shared/use-today";
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
  const today = useToday();
  const todo = selectTasksToDoNow(tasks, today);
  const { overdue, thisWeek } = classifyByDueDate(tasks, today);
  const next = todo.length === 0 ? findNextUpcoming(tasks, today) : null;

  return (
    <Stack maw={720} gap="lg">
      <Hero
        today={today}
        overdueCount={overdue.length}
        soonCount={thisWeek.length}
        productCount={products.length}
      />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end">
          <SectionTitle icon={IconChecklist}>今やること</SectionTitle>
          <Text size="xs" c="dimmed">
            期限切れと{DUE_SOON_DAYS}日以内のもの
          </Text>
        </Group>

        {products.length === 0 ? (
          <EmptyState
            icon={IconPackage}
            title="まずは製品を登録しましょう"
            action={
              <Button
                component={Link}
                to="/products/new"
                mt="sm"
                leftSection={<IconPlus size={18} />}
              >
                製品を登録
              </Button>
            }
          >
            家電や家具を登録すると、お手入れの予定をここでお知らせします。説明書の PDF
            からでも登録できます。
          </EmptyState>
        ) : todo.length === 0 ? (
          <EmptyState icon={IconConfetti} title="今やることはありません">
            {next ? (
              <>
                次は {formatDate(next.nextDueDate)}「{productMap.get(next.productId)?.name ?? ""}{" "}
                {next.title}」です。
              </>
            ) : (
              "すべて片付いています。すてきな一日を！"
            )}
          </EmptyState>
        ) : (
          <Stack gap="sm" className="stagger">
            {todo.map((task) => (
              <TodoCard
                key={task.id}
                task={task}
                product={productMap.get(task.productId)}
                today={today}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function Hero({
  today,
  overdueCount,
  soonCount,
  productCount,
}: {
  today: Date;
  overdueCount: number;
  soonCount: number;
  productCount: number;
}) {
  const total = overdueCount + soonCount;
  return (
    <Paper className="hero" radius="xl" p={{ base: "lg", sm: "xl" }} shadow="md">
      <IconSparkles size={160} stroke={1} className="hero-sparkle" />
      <Stack gap={4}>
        <Text size="sm" fw={500} opacity={0.9}>
          {greeting(today)}
        </Text>
        <Text fz={{ base: 26, sm: 30 }} fw={700} ff="heading" lh={1.3}>
          {dayjs(today).format("M月D日（ddd）")}
        </Text>
        <Text size="sm" opacity={0.95}>
          {total > 0 ? `今やることが ${total.toString()} 件あります` : "今やることはありません"}
        </Text>
      </Stack>
      <SimpleGrid cols={3} spacing="xs" mt="lg">
        <Stat label="期限切れ" value={overdueCount} />
        <Stat label={`${DUE_SOON_DAYS}日以内`} value={soonCount} />
        <Stat label="登録製品" value={productCount} />
      </SimpleGrid>
    </Paper>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Paper radius="lg" px="sm" py={8} bg="rgba(255, 255, 255, 0.16)" c="white">
      <Text size="xs" opacity={0.9}>
        {label}
      </Text>
      <Text fz={22} fw={700} lh={1.2}>
        {value}
      </Text>
    </Paper>
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
  const accent = overdue ? "red" : "apricot";
  return (
    <Card
      padding="md"
      className="lift accent-left"
      style={{ "--accent-color": `var(--mantine-color-${accent}-6)` }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <ProductAvatar product={product} size={44} />
            <div>
              <Text size="xs" c="dimmed">
                {product ? (
                  <Anchor
                    size="xs"
                    renderRoot={(props) => (
                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        {...props}
                      />
                    )}
                  >
                    {product.name}
                  </Anchor>
                ) : (
                  "(削除済み)"
                )}
              </Text>
              <Text fw={700} size="lg" lh={1.35}>
                {task.title}
              </Text>
              <Group gap={6} mt={2}>
                <IconCalendarEvent size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  期限 {formatDate(due)}
                </Text>
                {task.skipCount > 0 && (
                  <Badge color="yellow" variant="light" size="xs">
                    {task.skipCount}回スキップ中
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
          {due && (
            <Badge color={accent} variant="light" size="lg" style={{ flexShrink: 0 }}>
              {formatDueLabel(due, today)}
            </Badge>
          )}
        </Group>
        <Group grow>
          <CompleteButton taskId={task.id} size="md" variant="filled" />
          <SkipButton task={task} size="md" />
        </Group>
      </Stack>
    </Card>
  );
}
