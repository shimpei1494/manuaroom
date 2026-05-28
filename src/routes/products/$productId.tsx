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
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { useState } from "react";

import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { INTERVAL_UNIT_VALUES } from "../../domain/maintenance/maintenance-task";
import type { Manual } from "../../domain/manual/manual";
import type { Product } from "../../domain/product/product";
import { listAiSuggestionsFn } from "../../server-functions/ai-suggestions";
import { acceptAiSuggestionFn, rejectAiSuggestionFn } from "../../server-functions/ai-suggestions";
import {
  createMaintenanceTaskFn,
  listMaintenanceTasksFn,
  markMaintenanceDoneFn,
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
          <Button
            color="red"
            variant="light"
            loading={deleting}
            onClick={async () => {
              if (!confirm(`「${product.name}」を削除します。よろしいですか？`)) return;
              setDeleting(true);
              try {
                await deleteFn({ data: { productId: product.id } });
                await navigate({ to: "/products" });
              } finally {
                setDeleting(false);
              }
            }}
          >
            削除
          </Button>
        </Group>
      </Group>
      <Modal opened={editOpened} onClose={edit.close} title="製品を編集" size="lg">
        <EditProductForm
          product={product}
          onSaved={async () => {
            edit.close();
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
  const [error, setError] = useState<string | null>(null);

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
              onChange={(value) => {
                setError(null);
                setFile(value);
              }}
              error={error}
              clearable
            />
            <Button
              loading={uploading}
              disabled={!file}
              onClick={async () => {
                if (!file) return;
                setUploading(true);
                setError(null);
                try {
                  const formData = new FormData();
                  formData.append("productId", productId);
                  formData.append("file", file);
                  await upload({ data: formData });
                  setFile(null);
                  await router.invalidate();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
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
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function ManualCard({ manual, suggestions }: { manual: Manual; suggestions: AiSuggestion[] }) {
  const router = useRouter();
  const analyze = useServerFn(analyzeManualFn);
  const remove = useServerFn(deleteManualFn);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pending = suggestions.filter((s) => s.status === "pending");
  const accepted = suggestions.filter((s) => s.status === "accepted");
  const rejected = suggestions.filter((s) => s.status === "rejected");

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2}>
            <Anchor href={`/api/manuals/${manual.id}/file`} target="_blank" rel="noopener">
              {manual.fileName}
            </Anchor>
            <Text size="xs" c="dimmed">
              {formatFileSize(manual.fileSize)} · 登録日 {formatDate(manual.createdAt)}
            </Text>
          </Stack>
          <Group gap="xs">
            <AiStatusBadge status={manual.aiStatus} />
            <Tooltip label="OpenAI でメンテナンス候補を抽出します">
              <Button
                size="xs"
                variant="light"
                loading={analyzing || manual.aiStatus === "analyzing"}
                onClick={async () => {
                  setAnalyzing(true);
                  setErrorMsg(null);
                  try {
                    await analyze({ data: { manualId: manual.id } });
                    await router.invalidate();
                  } catch (e) {
                    setErrorMsg(e instanceof Error ? e.message : String(e));
                  } finally {
                    setAnalyzing(false);
                  }
                }}
              >
                AIで解析
              </Button>
            </Tooltip>
            <Button
              size="xs"
              color="red"
              variant="subtle"
              loading={deleting}
              onClick={async () => {
                if (!confirm(`「${manual.fileName}」を削除します。よろしいですか？`)) return;
                setDeleting(true);
                try {
                  await remove({ data: { manualId: manual.id } });
                  await router.invalidate();
                } finally {
                  setDeleting(false);
                }
              }}
            >
              削除
            </Button>
          </Group>
        </Group>
        {errorMsg && (
          <Text size="sm" c="red">
            {errorMsg}
          </Text>
        )}
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
                await router.invalidate();
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
                await router.invalidate();
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
  tasks: MaintenanceTask[];
}) {
  const [createOpened, createDisclosure] = useDisclosure(false);
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
                <TaskRow key={task.id} task={task} manuals={manuals} />
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
        <CreateMaintenanceTaskForm productId={productId} onCreated={createDisclosure.close} />
      </Modal>
    </Stack>
  );
}

function TaskRow({ task, manuals }: { task: MaintenanceTask; manuals: Manual[] }) {
  const router = useRouter();
  const markDone = useServerFn(markMaintenanceDoneFn);
  const [busy, setBusy] = useState(false);
  const overdue =
    task.nextDueDate !== null &&
    dayjs(task.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"));
  const sourceManual =
    task.sourceManualId !== null ? manuals.find((m) => m.id === task.sourceManualId) : null;
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
      <Table.Td>{formatDate(task.lastDoneAt)}</Table.Td>
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
        <ActionIcon.Group>
          <Button
            size="xs"
            variant="light"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await markDone({ data: { taskId: task.id } });
                await router.invalidate();
              } finally {
                setBusy(false);
              }
            }}
          >
            完了
          </Button>
        </ActionIcon.Group>
      </Table.Td>
    </Table.Tr>
  );
}

type CreateTaskValues = {
  title: string;
  intervalValue: number | "";
  intervalUnit: string | null;
  initialDueDate: Date | null;
  memo: string;
  url: string;
};

function CreateMaintenanceTaskForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: () => void;
}) {
  const router = useRouter();
  const create = useServerFn(createMaintenanceTaskFn);
  const form = useForm<CreateTaskValues>({
    initialValues: {
      title: "",
      intervalValue: "",
      intervalUnit: null,
      initialDueDate: null,
      memo: "",
      url: "",
    },
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
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await create({
          data: {
            productId,
            title: values.title.trim(),
            intervalValue: values.intervalValue === "" ? null : values.intervalValue,
            intervalUnit: (values.intervalUnit ?? null) as
              | (typeof INTERVAL_UNIT_VALUES)[number]
              | null,
            initialDueDate: values.initialDueDate,
            memo: emptyToNull(values.memo),
            url: emptyToNull(values.url),
          },
        });
        form.reset();
        onCreated();
        await router.invalidate();
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
            data={INTERVAL_UNIT_LABELS}
            clearable
            {...form.getInputProps("intervalUnit")}
          />
        </Group>
        <DateInput
          clearable
          label="初回予定日"
          description="未指定なら「今日 + 周期」で計算します"
          valueFormat="YYYY/MM/DD"
          {...form.getInputProps("initialDueDate")}
        />
        <TextInput label="参考URL" placeholder="https://..." {...form.getInputProps("url")} />
        <Textarea label="メモ" autosize minRows={2} {...form.getInputProps("memo")} />
        <Group justify="flex-end">
          <Button type="submit" loading={form.submitting}>
            追加
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const INTERVAL_UNIT_LABELS: { value: string; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
];

function formatInterval(
  value: number | null,
  unit: (typeof INTERVAL_UNIT_VALUES)[number] | null,
): string {
  if (value === null || unit === null) return "—";
  const label = INTERVAL_UNIT_LABELS.find((u) => u.value === unit)?.label ?? unit;
  return `${value.toString()}${label}ごと`;
}

function formatDate(value: Date | null): string {
  if (value === null) return "—";
  return dayjs(value).format("YYYY/MM/DD");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
