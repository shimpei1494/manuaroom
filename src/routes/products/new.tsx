import { Button, Group, Stack, TextInput, Textarea, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { emptyToNull } from "../../features/shared/form";
import { createProductFn } from "../../server-functions/products";

export const Route = createFileRoute("/products/new")({
  component: NewProductPage,
});

type FormValues = {
  name: string;
  manufacturer: string;
  modelNumber: string;
  category: string;
  location: string;
  purchaseDate: Date | null;
  warrantyUntil: Date | null;
  memo: string;
};

function NewProductPage() {
  const navigate = useNavigate();
  const create = useServerFn(createProductFn);

  const form = useForm<FormValues>({
    initialValues: {
      name: "",
      manufacturer: "",
      modelNumber: "",
      category: "",
      location: "",
      purchaseDate: null,
      warrantyUntil: null,
      memo: "",
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? "製品名は必須です" : null),
    },
  });

  return (
    <Stack maw={640}>
      <Title order={2}>製品の新規登録</Title>
      <form
        onSubmit={form.onSubmit(async (values) => {
          await create({
            data: {
              name: values.name.trim(),
              manufacturer: emptyToNull(values.manufacturer),
              modelNumber: emptyToNull(values.modelNumber),
              category: emptyToNull(values.category),
              location: emptyToNull(values.location),
              purchaseDate: values.purchaseDate,
              warrantyUntil: values.warrantyUntil,
              memo: emptyToNull(values.memo),
            },
          });
          await navigate({ to: "/products" });
        })}
      >
        <Stack>
          <TextInput
            required
            label="製品名"
            placeholder="例: リビングのエアコン"
            {...form.getInputProps("name")}
          />
          <TextInput label="メーカー" {...form.getInputProps("manufacturer")} />
          <TextInput label="型番" {...form.getInputProps("modelNumber")} />
          <TextInput
            label="カテゴリ"
            placeholder="例: エアコン"
            {...form.getInputProps("category")}
          />
          <TextInput
            label="設置場所"
            placeholder="例: リビング"
            {...form.getInputProps("location")}
          />
          <DateInput
            clearable
            label="購入日"
            valueFormat="YYYY/MM/DD"
            {...form.getInputProps("purchaseDate")}
          />
          <DateInput
            clearable
            label="保証期限"
            valueFormat="YYYY/MM/DD"
            {...form.getInputProps("warrantyUntil")}
          />
          <Textarea label="メモ" autosize minRows={2} {...form.getInputProps("memo")} />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                void navigate({ to: "/products" });
              }}
            >
              キャンセル
            </Button>
            <Button type="submit" loading={form.submitting}>
              登録
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
