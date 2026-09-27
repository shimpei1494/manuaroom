import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import type { Product } from "../../domain/product/product";
import { formatDate } from "../maintenance/format";

export function ProductInfo({ product }: { product: Product }) {
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
