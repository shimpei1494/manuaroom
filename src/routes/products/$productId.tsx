import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { useState } from "react";

import type { MaintenanceTaskListItem } from "../../application/usecases/list-maintenance-tasks";
import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { INTERVAL_UNIT_VALUES } from "../../domain/maintenance/maintenance-task";
import type { Manual } from "../../domain/manual/manual";
import type { Product } from "../../domain/product/product";
import { CompleteButton } from "../../features/maintenance/CompleteButton";
import {
  formatDate,
  formatInterval,
  INTERVAL_UNIT_LABELS,
} from "../../features/maintenance/format";
import { LastDoneCell } from "../../features/maintenance/LastDoneCell";
import { SkipButton } from "../../features/maintenance/SkipButton";
import {
  acceptAiSuggestionFn,
  listAiSuggestionsFn,
  rejectAiSuggestionFn,
} from "../../server-functions/ai-suggestions";
import {
  createMaintenanceTaskFn,
  deleteMaintenanceTaskFn,
  listMaintenanceTasksFn,
  updateMaintenanceTaskFn,
} from "../../server-functions/maintenance-tasks";
import {
  analyzeManualFn,
  deleteManualFn,
  listManualsFn,
  uploadManualFn,
} from "../../server-functions/manuals";
import { deleteProductFn, getProductFn, updateProductFn } from "../../server-functions/products";

async function loadProductDetail(productId: string) {
  const [product, manuals, tasks] = await Promise.all([
    getProductFn({ data: { productId } }),
    listManualsFn({ data: { productId } }),
    listMaintenanceTasksFn({ data: { productId } }),
  ]);
  const suggestionsByManual = await Promise.all(
    manuals.map((manual) =>
      listAiSuggestionsFn({ data: { manualId: manual.id } }).then((suggestions) => ({
        manualId: manual.id,
        suggestions,
      })),
    ),
  );
  const suggestionsMap: Record<string, AiSuggestion[]> = {};
  for (const { manualId, suggestions } of suggestionsByManual) {
    suggestionsMap[manualId] = suggestions;
  }
  return { product, manuals, tasks, suggestionsByManualId: suggestionsMap };
}

export const Route = createFileRoute("/products/$productId")({
  // 日付をブラウザのタイムゾーンで描くため (トップページと同じ理由)
  ssr: "data-only",
  loader: ({ params }) => loadProductDetail(params.productId),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { product, manuals, tasks, suggestionsByManualId } = Route.useLoaderData();
  return (
    <Stack>
      <ProductHeader product={product} />
      <ProductInfo product={product} />
      <ManualsSection
        productId={product.id}
        manuals={manuals}
        suggestionsByManualId={suggestionsByManualId}
      />
      <MaintenanceTasksSection productId={product.id} manuals={manuals} tasks={tasks} />
    </Stack>
  );
}

function ProductHeader({ product }: { product: Product }) {
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
          notifications.show({ color: "red", title: "削除に失敗しました", message: errMessage(e) });
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
          notifications.show({ color: "red", title: "更新に失敗しました", message: errMessage(e) });
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

function ProductInfo({ product }: { product: Product }) {
  return (
    <Paper withBorder p="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Field label="メーカー" value={product.manufacturer} />
        <Field label="型番" value={product.modelNumber} />
        <Field label="カテゴリ" value={product.category} />
        <Field label="設置場所" value={product.location} />
        <Field label="購入日" value={formatDate(product.purchaseDate)} />
        <Field label="保証期限" value={formatDate(product.warrantyUntil)} />
      </SimpleGrid>
      {product.memo && (
        <Stack gap={4} mt="md">
          <Text size="sm" c="dimmed">
            メモ
          </Text>
          <Text style={{ whiteSpace: "pre-wrap" }}>{product.memo}</Text>
        </Stack>
      )}
    </Paper>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text>{value ?? "—"}</Text>
    </Stack>
  );
}

function ManualsSection({
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
                    message: errMessage(e),
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

function ManualCard({
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
        message: errMessage(e),
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
            message: errMessage(e),
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
                  message: errMessage(e),
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
                  message: errMessage(e),
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

function MaintenanceTasksSection({
  productId,
  manuals,
  tasks,
}: {
  productId: string;
  manuals: Manual[];
  tasks: MaintenanceTaskListItem[];
}) {
  const [createOpened, createDisclosure] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={3}>メンテナンスタスク</Title>
        <Button onClick={createDisclosure.open}>タスクを追加</Button>
      </Group>
      {tasks.length === 0 ? (
        <Text c="dimmed">まだタスクが登録されていません。</Text>
      ) : (
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>タスク</Table.Th>
                <Table.Th>周期</Table.Th>
                <Table.Th>次回予定</Table.Th>
                <Table.Th>最終実施</Table.Th>
                <Table.Th>由来</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  manuals={manuals}
                  onEdit={() => {
                    setEditingTask(task);
                  }}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
      <Modal
        opened={createOpened}
        onClose={createDisclosure.close}
        title="メンテナンスタスクを追加"
      >
        <MaintenanceTaskForm mode="create" productId={productId} onDone={createDisclosure.close} />
      </Modal>
      <Modal
        opened={editingTask !== null}
        onClose={() => {
          setEditingTask(null);
        }}
        title="メンテナンスタスクを編集"
      >
        {editingTask && (
          <MaintenanceTaskForm
            mode="edit"
            productId={productId}
            task={editingTask}
            onDone={() => {
              setEditingTask(null);
            }}
          />
        )}
      </Modal>
    </Stack>
  );
}

function TaskRow({
  task,
  manuals,
  onEdit,
}: {
  task: MaintenanceTaskListItem;
  manuals: Manual[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const deleteTask = useServerFn(deleteMaintenanceTaskFn);
  const [deleting, setDeleting] = useState(false);
  const overdue =
    task.nextDueDate !== null &&
    dayjs(task.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"));
  const sourceManual =
    task.sourceManualId !== null ? manuals.find((m) => m.id === task.sourceManualId) : null;

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "タスクを削除",
      centered: true,
      children: <Text size="sm">「{task.title}」を削除します。履歴も全て削除されます。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteTask({ data: { taskId: task.id } });
          notifications.show({ color: "green", message: "タスクを削除しました" });
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "削除に失敗しました",
            message: errMessage(e),
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <Table.Tr>
      <Table.Td>
        <Text>{task.title}</Text>
        {task.memo && (
          <Text size="xs" c="dimmed">
            {task.memo}
          </Text>
        )}
      </Table.Td>
      <Table.Td>{formatInterval(task.intervalValue, task.intervalUnit)}</Table.Td>
      <Table.Td>
        <Group gap={6} align="center">
          <Text size="sm">{formatDate(task.nextDueDate)}</Text>
          {overdue && (
            <Badge color="red" size="xs">
              期限超過
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <LastDoneCell task={task} />
      </Table.Td>
      <Table.Td>
        {task.source === "ai" ? (
          <Tooltip label={sourceManual?.fileName ?? "AI"}>
            <Badge variant="light">AI</Badge>
          </Tooltip>
        ) : (
          <Badge variant="default">手動</Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <CompleteButton taskId={task.id} />
          <SkipButton task={task} />
          <ActionIcon variant="default" onClick={onEdit} aria-label="編集">
            ✎
          </ActionIcon>
          <ActionIcon
            color="red"
            variant="subtle"
            loading={deleting}
            onClick={handleDelete}
            aria-label="削除"
          >
            ×
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

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

function MaintenanceTaskForm(props: TaskFormProps) {
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
            message: errMessage(e),
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
