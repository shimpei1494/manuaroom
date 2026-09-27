import {
  Anchor,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { Product } from "../../domain/product/product";
import { deleteProductFn, updateProductFn } from "../../server-functions/products";
import { emptyToNull, errorMessage } from "../shared/form";

export function ProductHeader({ product }: { product: Product }) {
  const router = useRouter();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteProductFn);
  const [editOpened, edit] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "製品を削除",
      centered: true,
      children: (
        <Text size="sm">
          「{product.name}」を削除します。紐づく説明書・メンテナンスタスクも全て削除されます。
        </Text>
      ),
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteFn({ data: { productId: product.id } });
          notifications.show({ color: "green", message: "製品を削除しました" });
          await navigate({ to: "/products" });
        } catch (e) {
          notifications.show({
            color: "red",
            title: "削除に失敗しました",
            message: errorMessage(e),
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <Stack gap="xs">
      <Anchor component={Link} to="/products" size="sm">
        ← 製品一覧へ
      </Anchor>
      <Group justify="space-between" align="flex-start">
        <Title order={2}>{product.name}</Title>
        <Group>
          <Button variant="default" onClick={edit.open}>
            編集
          </Button>
          <Button color="red" variant="light" loading={deleting} onClick={handleDelete}>
            削除
          </Button>
        </Group>
      </Group>
      <Modal opened={editOpened} onClose={edit.close} title="製品を編集" size="lg">
        <EditProductForm
          product={product}
          onSaved={async () => {
            edit.close();
            notifications.show({ color: "green", message: "製品を更新しました" });
            await router.invalidate();
          }}
        />
      </Modal>
    </Stack>
  );
}

type EditFormValues = {
  name: string;
  manufacturer: string;
  modelNumber: string;
  category: string;
  location: string;
  purchaseDate: Date | null;
  warrantyUntil: Date | null;
  memo: string;
};

function EditProductForm({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const update = useServerFn(updateProductFn);
  const form = useForm<EditFormValues>({
    initialValues: {
      name: product.name,
      manufacturer: product.manufacturer ?? "",
      modelNumber: product.modelNumber ?? "",
      category: product.category ?? "",
      location: product.location ?? "",
      purchaseDate: product.purchaseDate,
      warrantyUntil: product.warrantyUntil,
      memo: product.memo ?? "",
    },
    validate: {
      name: (v) => (v.trim().length === 0 ? "製品名は必須です" : null),
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        try {
          await update({
            data: {
              productId: product.id,
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
          onSaved();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "更新に失敗しました",
            message: errorMessage(e),
          });
        }
      })}
    >
      <Stack>
        <TextInput required label="製品名" {...form.getInputProps("name")} />
        <TextInput label="メーカー" {...form.getInputProps("manufacturer")} />
        <TextInput label="型番" {...form.getInputProps("modelNumber")} />
        <TextInput label="カテゴリ" {...form.getInputProps("category")} />
        <TextInput label="設置場所" {...form.getInputProps("location")} />
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
          <Button type="submit" loading={form.submitting}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
