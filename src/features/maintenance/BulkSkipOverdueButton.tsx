import { Button, Checkbox, Group, Modal, ScrollArea, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlayerTrackNext } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { MaintenanceTaskListItem } from "../../application/usecases/list-maintenance-tasks";
import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import { isSkippable } from "../../domain/maintenance/skip-maintenance-task";
import type { Product } from "../../domain/product/product";
import { skipMaintenanceTasksFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";
import { formatDate } from "./format";
import { showRecordedNotification } from "./show-recorded-notification";

/** 1 件だけならカードのスキップで足りるので、2 件以上のときだけ出す。 */
const MIN_TASKS = 2;

/**
 * 期限切れのタスクをまとめて次の周期へ先送りする (ADR 0006 のスキップを複数件に)。
 * 確認ダイアログで対象と次回予定日を見せ、チェックを外したものは残す。周期のないタスクは対象外。
 */
export function BulkSkipOverdueButton({
  overdue,
  productMap,
  today,
}: {
  overdue: MaintenanceTaskListItem[];
  productMap: Map<string, Product>;
  today: Date;
}) {
  const router = useRouter();
  const skipAll = useServerFn(skipMaintenanceTasksFn);
  const [opened, setOpened] = useState(false);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const skippable = overdue.filter(isSkippable);
  if (skippable.length < MIN_TASKS) return null;
  const selected = skippable.filter((t) => !excluded.has(t.id));
  const withoutInterval = overdue.length - skippable.length;

  const close = () => {
    setOpened(false);
    setExcluded(new Set());
  };

  const toggle = (taskId: string, checked: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { skipped, notSkippedCount } = await skipAll({
        data: { tasks: selected.map((t) => ({ taskId: t.id, updatedAt: t.updatedAt })) },
      });
      if (skipped.length > 0) {
        showRecordedNotification(
          `${skipped.length.toString()} 件をスキップしました`,
          skipped.map(({ log }) => log.id),
        );
      }
      if (notSkippedCount > 0) {
        notifications.show({
          color: "yellow",
          message: `${notSkippedCount.toString()} 件はほかの操作で更新されていたため、スキップしませんでした`,
        });
      }
      close();
      await router.invalidate();
    } catch (e) {
      notifications.show({
        color: "red",
        title: "スキップに失敗しました",
        message: errorMessage(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group justify="flex-end">
      <Button
        size="xs"
        variant="light"
        color="gray"
        leftSection={<IconPlayerTrackNext size={14} stroke={1.8} />}
        onClick={() => {
          setOpened(true);
        }}
      >
        期限切れをまとめてスキップ ({skippable.length})
      </Button>
      <Modal opened={opened} onClose={close} title="期限切れをまとめてスキップ">
        <Stack>
          <Text size="sm">
            チェックしたタスクを今回はやらずに先送りします。次回はそれぞれ「今日 +
            周期」になります。 あとから通知や履歴で元に戻せます。
          </Text>
          <ScrollArea.Autosize mah={360}>
            <Stack gap="sm">
              {skippable.map((task) => (
                <Checkbox
                  key={task.id}
                  checked={!excluded.has(task.id)}
                  onChange={(e) => {
                    toggle(task.id, e.currentTarget.checked);
                  }}
                  label={`${productMap.get(task.productId)?.name ?? "(削除済み)"} ${task.title}`}
                  description={nextDueDescription(task, today)}
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
          {withoutInterval > 0 && (
            <Text size="xs" c="dimmed">
              周期が未設定の {withoutInterval} 件は対象外です。予定日は編集で変えられます。
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              キャンセル
            </Button>
            <Button loading={busy} disabled={selected.length === 0} onClick={submit}>
              {selected.length} 件をスキップする
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Group>
  );
}

function nextDueDescription(task: MaintenanceTaskListItem, today: Date): string {
  const { intervalValue, intervalUnit } = task;
  if (intervalValue === null || intervalUnit === null) return "";
  const next = calculateNextDueDate(today, intervalValue, intervalUnit);
  return `期限 ${formatDate(task.nextDueDate)} → 次回 ${formatDate(next)}`;
}
