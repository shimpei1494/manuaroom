import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconBarcode,
  IconBuildingFactory2,
  IconCalendarDollar,
  IconMapPin,
  IconNotes,
  IconShieldCheck,
  IconTag,
  type Icon,
} from "@tabler/icons-react";

import type { Product } from "../../domain/product/product";
import { formatDate } from "../maintenance/format";

export function ProductInfo({ product }: { product: Product }) {
  return (
    <Paper withBorder shadow="sm" p="lg">
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" verticalSpacing="md">
        <Field icon={IconBuildingFactory2} label="メーカー" value={product.manufacturer} />
        <Field icon={IconBarcode} label="型番" value={product.modelNumber} />
        <Field icon={IconTag} label="カテゴリ" value={product.category} />
        <Field icon={IconMapPin} label="設置場所" value={product.location} />
        <Field icon={IconCalendarDollar} label="購入日" value={formatDate(product.purchaseDate)} />
        <Field icon={IconShieldCheck} label="保証期限" value={formatDate(product.warrantyUntil)} />
      </SimpleGrid>
      {product.memo && (
        <Stack gap={4} mt="lg">
          <Group gap={6}>
            <IconNotes size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              メモ
            </Text>
          </Group>
          <Text style={{ whiteSpace: "pre-wrap" }}>{product.memo}</Text>
        </Stack>
      )}
    </Paper>
  );
}

function Field({
  icon: FieldIcon,
  label,
  value,
}: {
  icon: Icon;
  label: string;
  value: string | null;
}) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon size={32} radius="md" variant="light" color="gray">
        <FieldIcon size={18} stroke={1.6} />
      </ThemeIcon>
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>
          {value ?? "—"}
        </Text>
      </Stack>
    </Group>
  );
}
