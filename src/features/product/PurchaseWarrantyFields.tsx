import { Chip, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { DateInput, type DateValue } from "@mantine/dates";

import { findWarrantyPeriod } from "../../domain/product/warranty-period";
import {
  WARRANTY_PERIOD_PRESETS,
  dateValueToDate,
  formatWarrantyPeriod,
  warrantyUntilValue,
} from "./warranty-presets";

export type PurchaseWarrantyValues = {
  purchaseDate: DateValue;
  warrantyUntil: DateValue;
};

/**
 * 購入日と保証期限の入力欄。購入日があれば「1年」などの期間を選ぶだけで保証期限が入る。
 * 期間で入れたあとに購入日を直したら、保証期限も同じ期間でずらす。
 */
export function PurchaseWarrantyFields({
  values,
  onChange,
  cols = 2,
}: {
  values: PurchaseWarrantyValues;
  onChange: (next: PurchaseWarrantyValues) => void;
  cols?: 1 | 2;
}) {
  const purchase = dateValueToDate(values.purchaseDate);
  const selectedPeriod = findWarrantyPeriod(
    purchase,
    dateValueToDate(values.warrantyUntil),
    WARRANTY_PERIOD_PRESETS,
  );

  const changePurchaseDate = (purchaseDate: DateValue) => {
    const warrantyUntil =
      selectedPeriod !== null && purchaseDate !== null
        ? warrantyUntilValue(purchaseDate, selectedPeriod)
        : values.warrantyUntil;
    onChange({ purchaseDate, warrantyUntil });
  };

  const choosePeriod = (months: string) => {
    onChange({
      purchaseDate: values.purchaseDate,
      warrantyUntil: warrantyUntilValue(values.purchaseDate, Number(months)),
    });
  };

  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 1, sm: cols }}>
        <DateInput
          clearable
          label="購入日"
          valueFormat="YYYY/MM/DD"
          value={values.purchaseDate}
          onChange={changePurchaseDate}
        />
        <DateInput
          clearable
          label="保証期限"
          valueFormat="YYYY/MM/DD"
          value={values.warrantyUntil}
          onChange={(warrantyUntil) => {
            onChange({ purchaseDate: values.purchaseDate, warrantyUntil });
          }}
        />
      </SimpleGrid>
      <Stack gap={6}>
        <Text size="sm" c="dimmed">
          {purchase === null
            ? "購入日を入れると、保証期間を選ぶだけで保証期限が入ります"
            : "保証期間から入れる (購入日から)"}
        </Text>
        <Chip.Group
          multiple={false}
          value={selectedPeriod === null ? null : selectedPeriod.toString()}
          onChange={choosePeriod}
        >
          <Group gap="xs">
            {WARRANTY_PERIOD_PRESETS.map((months) => (
              <Chip key={months} value={months.toString()} size="sm" disabled={purchase === null}>
                {formatWarrantyPeriod(months)}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Stack>
    </Stack>
  );
}
