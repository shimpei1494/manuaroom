import { createFileRoute } from "@tanstack/react-router";

import { PdfViewerPage } from "../../features/manual/PdfViewerPage";

// スマホ・タブレットで説明書 PDF を見るページ。PDF をアプリの中で描画するので、
// ホーム画面に追加した PWA でもヘッダーの「戻る」で元の画面に戻れる。
export const Route = createFileRoute("/manuals/$manualId")({
  validateSearch: (search: Record<string, unknown>): { name?: string; productId?: string } => ({
    ...(typeof search.name === "string" ? { name: search.name } : {}),
    ...(typeof search.productId === "string" ? { productId: search.productId } : {}),
  }),
  // pdf.js はブラウザでしか動かない
  ssr: false,
  component: ManualViewerRoute,
});

function ManualViewerRoute() {
  const { manualId } = Route.useParams();
  const { name, productId } = Route.useSearch();
  return <PdfViewerPage manualId={manualId} fileName={name} productId={productId} />;
}
