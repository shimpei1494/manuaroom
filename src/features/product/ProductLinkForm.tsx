import { Button, Group, Stack, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { PRODUCT_LINK_LIMITS, type ProductLink } from "../../domain/product/product-link";
import { addProductLinkFn, updateProductLinkFn } from "../../server-functions/product-links";
import { emptyToNull, errorMessage } from "../shared/form";

type LinkFormValues = { url: string; title: string; description: string };

type LinkFormProps =
  | { mode: "create"; productId: string; onDone: () => void }
  | { mode: "edit"; link: ProductLink; onDone: () => void };

export function ProductLinkForm(props: LinkFormProps) {
  const router = useRouter();
  const add = useServerFn(addProductLinkFn);
  const update = useServerFn(updateProductLinkFn);
  const form = useForm<LinkFormValues>({
    initialValues:
      props.mode === "edit"
        ? {
            url: props.link.url,
            title: props.link.title,
            description: props.link.description ?? "",
          }
        : { url: "", title: "", description: "" },
    validate: {
      url: (v) =>
        /^https?:\/\/\S+$/i.test(v.trim()) ? null : "https:// で始まる URL を入力してください",
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const fields = {
          url: values.url.trim(),
          title: emptyToNull(values.title),
          description: emptyToNull(values.description),
        };
        try {
          if (props.mode === "edit") {
            await update({ data: { linkId: props.link.id, ...fields } });
            notifications.show({ color: "green", message: "リンクを更新しました" });
          } else {
            await add({ data: { productId: props.productId, ...fields } });
            notifications.show({ color: "green", message: "リンクを追加しました" });
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
          type="url"
          inputMode="url"
          label="URL"
          placeholder="https://..."
          maxLength={PRODUCT_LINK_LIMITS.url}
          data-autofocus
          {...form.getInputProps("url")}
        />
        <TextInput
          label="タイトル"
          description="未入力ならサイト名 (ホスト名) を使います"
          placeholder="例: 公式サポート FAQ"
          maxLength={PRODUCT_LINK_LIMITS.title}
          {...form.getInputProps("title")}
        />
        <Textarea
          label="何が書いてあるか"
          placeholder="例: エラーコード E3 の対処方法が載っている"
          autosize
          minRows={2}
          maxLength={PRODUCT_LINK_LIMITS.description}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={form.submitting}>
            {props.mode === "edit" ? "保存" : "追加"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
