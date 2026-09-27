import { Button, FileInput, Group, Modal, Paper, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { Manual } from "../../domain/manual/manual";
import { uploadManualFn } from "../../server-functions/manuals";
import { errorMessage } from "../shared/form";
import { ManualCard } from "./ManualCard";

export function ManualsSection({
  productId,
  manuals,
  suggestionsByManualId,
}: {
  productId: string;
  manuals: Manual[];
  suggestionsByManualId: Record<string, AiSuggestion[]>;
}) {
  const router = useRouter();
  const upload = useServerFn(uploadManualFn);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewManual, setPreviewManual] = useState<Manual | null>(null);

  return (
    <Stack gap="sm">
      <Title order={3}>説明書</Title>
      <Paper withBorder p="md">
        <Stack gap="sm">
          <Group align="flex-end">
            <FileInput
              flex={1}
              label="PDF をアップロード"
              placeholder="PDF ファイルを選択"
              accept="application/pdf"
              value={file}
              onChange={setFile}
              clearable
            />
            <Button
              loading={uploading}
              disabled={!file}
              onClick={async () => {
                if (!file) return;
                setUploading(true);
                try {
                  const formData = new FormData();
                  formData.append("productId", productId);
                  formData.append("file", file);
                  await upload({ data: formData });
                  setFile(null);
                  notifications.show({ color: "green", message: "説明書をアップロードしました" });
                  await router.invalidate();
                } catch (e) {
                  notifications.show({
                    color: "red",
                    title: "アップロードに失敗しました",
                    message: errorMessage(e),
                  });
                } finally {
                  setUploading(false);
                }
              }}
            >
              アップロード
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            PDF のみ、20MB まで。
          </Text>
        </Stack>
      </Paper>

      {manuals.length === 0 ? (
        <Text c="dimmed">まだ説明書が登録されていません。</Text>
      ) : (
        <Stack gap="md">
          {manuals.map((manual) => (
            <ManualCard
              key={manual.id}
              manual={manual}
              suggestions={suggestionsByManualId[manual.id] ?? []}
              onPreview={() => {
                setPreviewManual(manual);
              }}
            />
          ))}
        </Stack>
      )}

      <PdfPreviewModal
        manual={previewManual}
        onClose={() => {
          setPreviewManual(null);
        }}
      />
    </Stack>
  );
}

function PdfPreviewModal({ manual, onClose }: { manual: Manual | null; onClose: () => void }) {
  return (
    <Modal
      opened={manual !== null}
      onClose={onClose}
      title={manual?.fileName ?? ""}
      size="90%"
      padding={0}
    >
      {manual && (
        <iframe
          title={manual.fileName}
          src={`/api/manuals/${manual.id}/file`}
          style={{ width: "100%", height: "80vh", border: 0, display: "block" }}
        />
      )}
    </Modal>
  );
}
