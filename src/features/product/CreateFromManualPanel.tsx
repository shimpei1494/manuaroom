import { Button, FileInput, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { createProductFromManualFn } from "../../server-functions/products";
import { errorMessage } from "../shared/form";

const DESCRIPTION =
  "AI が説明書から製品名・メーカー・型番・カテゴリを読み取って登録し、説明書も一緒に保存します。内容はあとから編集できます。";

/** 説明書 PDF を選ぶと、AI が読み取った内容でそのまま製品を登録する。 */
export function CreateFromManualPanel() {
  const navigate = useNavigate();
  const createFromManual = useServerFn(createProductFromManualFn);
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>説明書 PDF から登録</Title>
        <Text size="sm">{DESCRIPTION}</Text>
        <Group align="flex-end">
          <FileInput
            flex={1}
            label="説明書 PDF"
            placeholder="PDF ファイルを選択"
            accept="application/pdf"
            value={file}
            onChange={setFile}
            clearable
          />
          <Button
            loading={creating}
            disabled={!file}
            onClick={async () => {
              if (!file) return;
              setCreating(true);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const product = await createFromManual({ data: formData });
                notifications.show({
                  color: "green",
                  title: `「${product.name}」を登録しました`,
                  message: "読み取った内容が違うときは「編集」で直してください。",
                });
                await navigate({
                  to: "/products/$productId",
                  params: { productId: product.id },
                });
              } catch (e) {
                notifications.show({
                  color: "red",
                  title: "読み取りに失敗しました",
                  message: errorMessage(e),
                });
                setCreating(false);
              }
            }}
          >
            PDF から登録
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          PDF のみ、20MB まで。読み取りには数十秒かかることがあります。
        </Text>
      </Stack>
    </Paper>
  );
}
