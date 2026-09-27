import { Anchor, Badge, Box, Card, Group, Paper, Stack, Switch, Text, Title } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";

import {
  buildCalendarEntries,
  type CalendarEntry,
  PROJECTION_MONTHS,
} from "../domain/maintenance/build-calendar-entries";
import {
  CALENDAR_ENTRY_KINDS,
  calendarEntryKindStyle,
} from "../features/maintenance/calendar-entry-kind";
import {
  listMaintenanceLogsInPeriodFn,
  listMaintenanceTasksFn,
} from "../server-functions/maintenance-tasks";
import { listProductsFn } from "../server-functions/products";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>): { month?: string } =>
    typeof search.month === "string" && MONTH_PATTERN.test(search.month)
      ? { month: search.month }
      : {},
  loaderDeps: ({ search }) => ({ month: search.month }),
  // 月の範囲と「今日」をブラウザのタイムゾーンで決めるため、データの取得も画面もブラウザで行う
  ssr: false,
  loader: async ({ deps }) => {
    const month = (deps.month ? dayjs(`${deps.month}-01`) : dayjs()).startOf("month");
    const [tasks, products, logs] = await Promise.all([
      listMaintenanceTasksFn({ data: {} }),
      listProductsFn(),
      listMaintenanceLogsInPeriodFn({
        data: { from: month.toDate(), to: month.add(1, "month").toDate() },
      }),
    ]);
    return { month: month.toDate(), tasks, products, logs };
  },
  component: CalendarPage,
});

function CalendarPage() {
  const { month, tasks, products, logs } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const today = new Date();
  const [showProjected, setShowProjected] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const entries = buildCalendarEntries({ tasks, logs, month, today }).filter(
    (e) => showProjected || e.kind !== "projected",
  );
  const byDay = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry]);
  }
  const todayKey = dayjs(today).format("YYYY-MM-DD");
  const day = selectedDay ?? (byDay.has(todayKey) ? todayKey : null);

  return (
    <Stack maw={640}>
      <Title order={2}>カレンダー</Title>
      <Paper withBorder p="sm">
        <Calendar
          date={month}
          onDateChange={(date) => {
            setSelectedDay(null);
            void navigate({ search: { month: date.slice(0, 7) } });
          }}
          maxLevel="year"
          monthLabelFormat="YYYY年M月"
          hideOutsideDates
          size="lg"
          fullWidth
          getDayProps={(date) => ({
            selected: date === day,
            onClick: () => {
              setSelectedDay(date);
            },
          })}
          renderDay={(date) => <DayCell date={date} entries={byDay.get(date) ?? []} />}
        />
        <Group gap="md" mt="sm" justify="center">
          {CALENDAR_ENTRY_KINDS.map(({ kind, label, color }) => (
            <Group key={kind} gap={4}>
              <Dot color={color} />
              <Text size="xs">{label}</Text>
            </Group>
          ))}
        </Group>
      </Paper>
      <Switch
        checked={showProjected}
        onChange={(e) => {
          setShowProjected(e.currentTarget.checked);
        }}
        label={`目安を出す（次回予定から周期を足した日。今日から${PROJECTION_MONTHS.toString()}か月先まで）`}
      />
      {day !== null && (
        <DayDetail
          day={day}
          entries={byDay.get(day) ?? []}
          taskMap={new Map(tasks.map((t) => [t.id, t] as const))}
          productMap={new Map(products.map((p) => [p.id, p] as const))}
        />
      )}
    </Stack>
  );
}

function DayCell({ date, entries }: { date: string; entries: CalendarEntry[] }) {
  // 同じ種類は 1 つの点にまとめる (スマホでもセルに収まるように)
  const kinds = CALENDAR_ENTRY_KINDS.filter(({ kind }) => entries.some((e) => e.kind === kind));
  return (
    <Stack gap={2} align="center">
      <span>{dayjs(date).date()}</span>
      <Group gap={2} h={6} wrap="nowrap">
        {kinds.map(({ kind, color }) => (
          <Dot key={kind} color={color} />
        ))}
      </Group>
    </Stack>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <Box
      w={6}
      h={6}
      style={{ borderRadius: "50%", backgroundColor: `var(--mantine-color-${color}-6)` }}
    />
  );
}

function DayDetail({
  day,
  entries,
  taskMap,
  productMap,
}: {
  day: string;
  entries: CalendarEntry[];
  taskMap: Map<string, { title: string; productId: string }>;
  productMap: Map<string, { id: string; name: string }>;
}) {
  // 同じ日に同じタスクを何度も記録した場合は 1 行にまとめて回数を出す
  const rows = CALENDAR_ENTRY_KINDS.flatMap(({ kind }) => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (e.kind === kind) counts.set(e.taskId, (counts.get(e.taskId) ?? 0) + 1);
    }
    return [...counts].map(([taskId, count]) => ({ kind, taskId, count }));
  });
  return (
    <Card withBorder>
      <Stack gap="xs">
        <Text fw={700}>{dayjs(day).format("M月D日（ddd）")}</Text>
        {rows.length === 0 && <Text c="dimmed">予定も記録もありません。</Text>}
        {rows.map((entry) => {
          const task = taskMap.get(entry.taskId);
          const product = task ? productMap.get(task.productId) : undefined;
          const { label, color } = calendarEntryKindStyle(entry.kind);
          return (
            <Group key={`${entry.kind}-${entry.taskId}`} gap="sm" wrap="nowrap">
              <Badge
                color={color}
                variant={entry.kind === "projected" ? "outline" : "light"}
                w={72}
                style={{ flexShrink: 0 }}
              >
                {label}
              </Badge>
              <Text size="sm">
                {product ? (
                  <Anchor
                    size="sm"
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
                  <Text span c="dimmed" size="sm">
                    (削除済み)
                  </Text>
                )}{" "}
                {task?.title ?? "(削除済みのタスク)"}
                {entry.count > 1 && `（${entry.count.toString()}回）`}
              </Text>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}
