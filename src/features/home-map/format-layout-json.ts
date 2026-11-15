import type { HomeLayout } from "../../domain/home-map/home-layout";

/** 間取りを読みやすい JSON にする。座標の配列は 1 行にまとめる。 */
export function formatLayoutJson(layout: HomeLayout): string {
  return JSON.stringify(layout, null, 2).replace(/\[\s+-?[\d.]+(?:,\s+-?[\d.]+)*\s+\]/g, (match) =>
    match
      .replace(/^\[\s+/, "[")
      .replace(/\s+\]$/, "]")
      .replace(/,\s+/g, ", "),
  );
}
