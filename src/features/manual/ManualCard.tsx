import { Anchor, Badge, Button, Card, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { Manual } from "../../domain/manual/manual";
import { acceptAiSuggestionFn, rejectAiSuggestionFn } from "../../server-functions/ai-suggestions";
import { analyzeManualFn, deleteManualFn } from "../../server-functions/manuals";
import { formatDate, formatInterval } from "../maintenance/format";
import { errorMessage } from "../shared/form";

export function ManualCard({
  manual,
  suggestions,
  onPreview,
}: {
  manual: Manual;
  suggestions: AiSuggestion[];
  onPreview: () => void;
}) {
  const router = useRouter();
  const analyze = useServerFn(analyzeManualFn);
  const remove = useServerFn(deleteManualFn);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pending = suggestions.filter((s) => s.status === "pending");
  const accepted = suggestions.filter((s) => s.status === "accepted");
  const rejected = suggestions.filter((s) => s.status === "rejected");

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const notifId = notifications.show({
      loading: true,
      message: "AI 解析中…",
      autoClose: false,
      withCloseButton: false,
    });
    try {
      const result = await analyze({ data: { manualId: manual.id } });
      notifications.update({
        id: notifId,
        loading: false,
        color: "green",
        title: "解析完了",
        message: `${result.length.toString()} 件の候補が抽出されました`,
        autoClose: 4000,
        withCloseButton: true,
      });
      await router.invalidate();
    } catch (e) {
      notifications.update({
        id: notifId,
        loading: false,
        color: "red",
        title: "解析に失敗しました",
        message: errorMessage(e),
        autoClose: 6000,
        withCloseButton: true,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "説明書を削除",
      centered: true,
      children: <Text size="sm">「{manual.fileName}」を削除します。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setDeleting(true);
        try {
          await remove({ data: { manualId: manual.id } });
          notifications.show({ color: "green", message: "説明書を削除しました" });
          await router.invalidate();
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
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2}>
            <Anchor component="button" type="button" onClick={onPreview}>
              {manual.fileName}
            </Anchor>
            <Text size="xs" c="dimmed">
              {formatFileSize(manual.fileSize)} · 登録日 {formatDate(manual.createdAt)}
            </Text>
          </Stack>
          <Group gap="xs">
            <AiStatusBadge status={manual.aiStatus} />
            <Button size="xs" variant="default" onClick={onPreview}>
              プレビュー
            </Button>
            <Tooltip label="OpenAI でメンテナンス候補を抽出します">
              <Button
                size="xs"
                variant="light"
                loading={analyzing || manual.aiStatus === "analyzing"}
                onClick={handleAnalyze}
              >
                AIで解析
              </Button>
            </Tooltip>
            <Button
              size="xs"
              color="red"
              variant="subtle"
              loading={deleting}
              onClick={handleDelete}
            >
              削除
            </Button>
          </Group>
        </Group>
        {suggestions.length > 0 && (
          <Stack gap="xs" mt="sm">
            <Text size="sm" fw={500}>
              AI 候補 ({pending.length} pending / {accepted.length} accepted / {rejected.length}{" "}
              rejected)
            </Text>
            {pending.length === 0 && (
              <Text size="xs" c="dimmed">
                未処理の候補はありません。
              </Text>
            )}
            {pending.map((s) => (
              <SuggestionRow key={s.id} suggestion={s} />
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function SuggestionRow({ suggestion }: { suggestion: AiSuggestion }) {
  const router = useRouter();
  const accept = useServerFn(acceptAiSuggestionFn);
  const reject = useServerFn(rejectAiSuggestionFn);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  return (
    <Paper withBorder p="xs">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2} flex={1}>
          <Text size="sm" fw={500}>
            {suggestion.payload.title}
          </Text>
          <Text size="xs" c="dimmed">
            {formatInterval(suggestion.payload.intervalValue, suggestion.payload.intervalUnit)}
            {suggestion.payload.sourcePage !== null
              ? ` · p.${suggestion.payload.sourcePage.toString()}`
              : ""}
          </Text>
          {suggestion.payload.memo && <Text size="xs">{suggestion.payload.memo}</Text>}
        </Stack>
        <Group gap="xs">
          <Button
            size="xs"
            loading={busy === "accept"}
            disabled={busy !== null}
            onClick={async () => {
              setBusy("accept");
              try {
                await accept({ data: { suggestionId: suggestion.id } });
                notifications.show({
                  color: "green",
                  message: "候補をメンテナンスタスクに登録しました",
                });
                await router.invalidate();
              } catch (e) {
                notifications.show({
                  color: "red",
                  title: "承認に失敗しました",
                  message: errorMessage(e),
                });
              } finally {
                setBusy(null);
              }
            }}
          >
            承認
          </Button>
          <Button
            size="xs"
            variant="default"
            loading={busy === "reject"}
            disabled={busy !== null}
            onClick={async () => {
              setBusy("reject");
              try {
                await reject({ data: { suggestionId: suggestion.id } });
                notifications.show({ color: "gray", message: "候補を却下しました" });
                await router.invalidate();
              } catch (e) {
                notifications.show({
                  color: "red",
                  title: "却下に失敗しました",
                  message: errorMessage(e),
                });
              } finally {
                setBusy(null);
              }
            }}
          >
            却下
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

function AiStatusBadge({ status }: { status: Manual["aiStatus"] }) {
  const map: Record<Manual["aiStatus"], { label: string; color: string }> = {
    not_analyzed: { label: "未解析", color: "gray" },
    analyzing: { label: "解析中", color: "yellow" },
    done: { label: "解析済み", color: "green" },
    error: { label: "解析失敗", color: "red" },
  };
  const { label, color } = map[status];
  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
