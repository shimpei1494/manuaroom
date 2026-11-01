import { useMediaQuery } from "@mantine/hooks";

export function manualFileUrl(manualId: string): string {
  return `/api/manuals/${manualId}/file`;
}

/**
 * スマホ・タブレットでは PDF を iframe に埋め込まず、新しいタブで開く。
 *
 * iOS / iPadOS の Safari は iframe 内の PDF を 1 ページ目だけ画像のように描画し、
 * スクロールもできない。Android の Chrome は iframe 内に PDF ビューアを持たない。
 * 新しいタブで開けば OS 標準のビューアで全ページを拡大・スクロールでき、共有や保存もできる。
 */
export function usePdfOpensInNewTab(): boolean {
  return useMediaQuery("(max-width: 48em), (pointer: coarse)");
}
