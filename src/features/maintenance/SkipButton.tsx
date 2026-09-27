import { Button, type ButtonProps, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { useState } from "react";

import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { skipMaintenanceFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";

/**
 * その回はやらずに次の周期へ先送りする (ADR 0006)。
 * 押すと確認ダイアログで先に次回予定日を見せる。周期のないタスクには出さない。
 */
export function SkipButton({
  task,
  size = "xs",
}: {
  task: MaintenanceTask;
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const skip = useServerFn(skipMaintenanceFn);
  const [opened, setOpened] = useState(false);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const { intervalValue, intervalUnit } = task;
  if (intervalValue === null || intervalUnit === null) return null;
  const nextDueDate = calculateNextDueDate(new Date(), intervalValue, intervalUnit);

  const close = () => {
    setOpened(false);
    setMemo("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      await skip({ data: { taskId: task.id, memo: memo.trim() === "" ? null : memo.trim() } });
      notifications.show({ color: "green", message: "スキップしました" });
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
    <>
      <Button
        size={size}
        variant="default"
        onClick={() => {
          setOpened(true);
        }}
      >
        スキップ
      </Button>
      <Modal opened={opened} onClose={close} title="スキップ" centered>
        <Stack>
          <Text size="sm">
            「{task.title}」を今回はやらずに先送りします。次回は{" "}
            <Text span fw={700}>
              {dayjs(nextDueDate).format("YYYY/MM/DD")}
            </Text>{" "}
            になります。
          </Text>
          <Textarea
            label="メモ（任意）"
            placeholder="まだ汚れていない など"
            autosize
            minRows={2}
            value={memo}
            onChange={(e) => {
              setMemo(e.currentTarget.value);
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              キャンセル
            </Button>
            <Button loading={busy} onClick={submit}>
              スキップする
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
