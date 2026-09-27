import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import { MaintenanceTasksSection } from "../../features/maintenance/MaintenanceTasksSection";
import { ManualsSection } from "../../features/manual/ManualsSection";
import { ProductHeader } from "../../features/product/ProductHeader";
import { ProductInfo } from "../../features/product/ProductInfo";
import { listAiSuggestionsFn } from "../../server-functions/ai-suggestions";
import { listMaintenanceTasksFn } from "../../server-functions/maintenance-tasks";
import { listManualsFn } from "../../server-functions/manuals";
import { getProductFn } from "../../server-functions/products";

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
