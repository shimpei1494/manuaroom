import {
  Badge,
  Button,
  FileInput,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileTypePdf, IconSparkles } from "@tabler/icons-react";
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
    <Paper p="lg" shadow="sm" className="ai-panel">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={40}
            radius="xl"
            variant="gradient"
            gradient={{ from: "mint.5", to: "violet.5", deg: 120 }}
          >
            <IconSparkles size={22} />
          </ThemeIcon>
          <Title order={4}>説明書 PDF から登録</Title>
          <Badge variant="light" color="violet">
            おすすめ
          </Badge>
        </Group>
        <Text size="sm">{DESCRIPTION}</Text>
        <Group align="flex-end">
          <FileInput
            flex={1}
            label="説明書 PDF"
            placeholder="PDF ファイルを選択"
            accept="application/pdf"
            leftSection={<IconFileTypePdf size={18} />}
            value={file}
            onChange={setFile}
            clearable
          />
          <Button
            loading={creating}
            disabled={!file}
            variant="gradient"
            gradient={{ from: "mint.6", to: "violet.5", deg: 120 }}
            leftSection={<IconSparkles size={18} />}
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
