import { Anchor, Button, Group, Stack, Table, Text, Title } from "@mantine/core";
import { Link, createFileRoute } from "@tanstack/react-router";

import { listProductsFn } from "../../server-functions/products";

export const Route = createFileRoute("/products/")({
  loader: () => listProductsFn(),
  component: ProductsPage,
});

function ProductsPage() {
  const products = Route.useLoaderData();
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>製品一覧</Title>
        <Button component={Link} to="/products/new">
          新規登録
        </Button>
      </Group>
      {products.length === 0 ? (
        <Text c="dimmed">
          まだ製品が登録されていません。「新規登録」から最初の製品を追加してください。
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>製品名</Table.Th>
              <Table.Th>メーカー</Table.Th>
              <Table.Th>型番</Table.Th>
              <Table.Th>カテゴリ</Table.Th>
              <Table.Th>設置場所</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map((product) => (
              <Table.Tr key={product.id}>
                <Table.Td>
                  <Anchor
                    renderRoot={(props) => (
                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        {...props}
                      />
                    )}
                  >
                    {product.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>{product.manufacturer ?? "—"}</Table.Td>
                <Table.Td>{product.modelNumber ?? "—"}</Table.Td>
                <Table.Td>{product.category ?? "—"}</Table.Td>
                <Table.Td>{product.location ?? "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
