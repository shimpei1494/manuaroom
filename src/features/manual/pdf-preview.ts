import { useMediaQuery } from "@mantine/hooks";

export function manualFileUrl(manualId: string): string {
  return `/api/manuals/${manualId}/file`;
}

/**
 * スマホ・タブレットでは PDF を iframe に埋め込まず、アプリ内のビューア (/manuals/:id) で開く。
 *
 * iOS / iPadOS の Safari は iframe 内の PDF を 1 ページ目だけ画像のように描画し、
 * スクロールもできない。Android の Chrome は iframe 内に PDF ビューアを持たない。
 */
export function useUsesPdfViewerPage(): boolean {
  return useMediaQuery("(max-width: 48em), (pointer: coarse)");
}

/** ホーム画面に追加した PWA として開いているか。PWA では別タブで開いた PDF から戻れない。 */
export function useIsStandalone(): boolean {
  return useMediaQuery("(display-mode: standalone)");
}
