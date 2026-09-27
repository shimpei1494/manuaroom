import { Button, Group, NumberInput, Select, Stack, TextInput, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { INTERVAL_UNIT_VALUES } from "../../domain/maintenance/maintenance-task";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import {
  createMaintenanceTaskFn,
  updateMaintenanceTaskFn,
} from "../../server-functions/maintenance-tasks";
import { emptyToNull, errorMessage } from "../shared/form";
import { INTERVAL_UNIT_LABELS } from "./format";

type TaskFormValues = {
  title: string;
  intervalValue: number | "";
  intervalUnit: string | null;
  dueDate: Date | null;
  memo: string;
  url: string;
};

type TaskFormProps =
  | { mode: "create"; productId: string; onDone: () => void }
  | { mode: "edit"; productId: string; task: MaintenanceTask; onDone: () => void };

export function MaintenanceTaskForm(props: TaskFormProps) {
  const router = useRouter();
  const create = useServerFn(createMaintenanceTaskFn);
  const update = useServerFn(updateMaintenanceTaskFn);
  const initial =
    props.mode === "edit"
      ? {
          title: props.task.title,
          intervalValue: (props.task.intervalValue ?? "") as number | "",
          intervalUnit: props.task.intervalUnit ?? null,
          dueDate: props.task.nextDueDate,
          memo: props.task.memo ?? "",
          url: props.task.url ?? "",
        }
      : {
          title: "",
          intervalValue: "" as const,
          intervalUnit: null,
          dueDate: null,
          memo: "",
          url: "",
        };
  const form = useForm<TaskFormValues>({
    initialValues: initial,
    validate: {
      title: (v) => (v.trim().length === 0 ? "タスク名は必須です" : null),
      intervalValue: (v, values) => {
        if (values.intervalUnit !== null && (v === "" || v <= 0)) {
          return "1 以上の整数を入力してください";
        }
        return null;
      },
      intervalUnit: (v, values) => {
        if (values.intervalValue !== "" && v === null) return "単位を選択してください";
        return null;
      },
    },
  });
  const submitLabel = props.mode === "edit" ? "保存" : "追加";
  const dueDateLabel = props.mode === "edit" ? "次回予定日" : "初回予定日";
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const intervalValue = values.intervalValue === "" ? null : values.intervalValue;
        const intervalUnit = (values.intervalUnit ?? null) as
          | (typeof INTERVAL_UNIT_VALUES)[number]
          | null;
        try {
          if (props.mode === "edit") {
            await update({
              data: {
                taskId: props.task.id,
                title: values.title.trim(),
                intervalValue,
                intervalUnit,
                memo: emptyToNull(values.memo),
                url: emptyToNull(values.url),
                nextDueDate: values.dueDate,
              },
            });
            notifications.show({ color: "green", message: "タスクを更新しました" });
          } else {
            await create({
              data: {
                productId: props.productId,
                title: values.title.trim(),
                intervalValue,
                intervalUnit,
                initialDueDate: values.dueDate,
                memo: emptyToNull(values.memo),
                url: emptyToNull(values.url),
              },
            });
            notifications.show({ color: "green", message: "タスクを追加しました" });
            form.reset();
          }
          props.onDone();
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "保存に失敗しました",
            message: errorMessage(e),
          });
        }
      })}
    >
      <Stack>
        <TextInput
          required
          label="タスク名"
          placeholder="例: フィルター掃除"
          {...form.getInputProps("title")}
        />
        <Group grow align="flex-start">
          <NumberInput
            label="周期"
            min={1}
            placeholder="2"
            {...form.getInputProps("intervalValue")}
          />
          <Select
            label="単位"
            placeholder="単位"
            data={INTERVAL_UNIT_OPTIONS}
            clearable
            {...form.getInputProps("intervalUnit")}
          />
        </Group>
        <DateInput
          clearable
          label={dueDateLabel}
          description={
            props.mode === "create" ? "未指定なら「今日 + 周期」で計算します" : undefined
          }
          valueFormat="YYYY/MM/DD"
          {...form.getInputProps("dueDate")}
        />
        <TextInput label="参考URL" placeholder="https://..." {...form.getInputProps("url")} />
        <Textarea label="メモ" autosize minRows={2} {...form.getInputProps("memo")} />
        <Group justify="flex-end">
          <Button type="submit" loading={form.submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const INTERVAL_UNIT_OPTIONS = INTERVAL_UNIT_VALUES.map((value) => ({
  value,
  label: INTERVAL_UNIT_LABELS[value],
}));
