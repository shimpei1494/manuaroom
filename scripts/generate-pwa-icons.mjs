// PWA / ホーム画面用のアイコンを public/ に書き出す。ロゴ (src/components/Logo.tsx) と同じ
// IconHomeHeart とミントのグラデーションを使う。デザインを変えたら `vp run icons` で作り直す。
// Playwright の Chromium で SVG を PNG にする (別のブラウザを使うときは CHROMIUM_PATH を指定)。
import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

// @tabler/icons-react の IconHomeHeart (24x24, stroke)
const ICON_PATHS = [
  "M21 12l-9 -9l-9 9h2v7a2 2 0 0 0 2 2h6",
  "M9 21v-6a2 2 0 0 1 2 -2h2c.39 0 .754 .112 1.061 .304",
  "M19 21.5l2.518 -2.58a1.74 1.74 0 0 0 0 -2.413a1.627 1.627 0 0 0 -2.346 0l-.168 .172l-.168 -.172a1.627 1.627 0 0 0 -2.346 0a1.74 1.74 0 0 0 0 2.412l2.51 2.59l0 -.009",
];

/**
 * @param {{ radius: number; iconScale: number }} options
 *   radius: 角丸 (0 = 正方形。iOS とマスカブルアイコンは OS 側で切り抜く)
 *   iconScale: 一辺に対するアイコンの大きさ。マスカブルは中央 80% の円に収める
 */
function iconSvg({ radius, iconScale }) {
  const size = 512;
  const iconSize = size * iconScale;
  const offset = (size - iconSize) / 2;
  const paths = ICON_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5bcaa7"/>
      <stop offset="1" stop-color="#0ca678"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(${offset} ${offset}) scale(${iconSize / 24})" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>
`;
}

const outputs = [
  { file: "icons/icon-192.png", size: 192, svg: iconSvg({ radius: 96, iconScale: 0.6 }) },
  { file: "icons/icon-512.png", size: 512, svg: iconSvg({ radius: 96, iconScale: 0.6 }) },
  { file: "icons/maskable-512.png", size: 512, svg: iconSvg({ radius: 0, iconScale: 0.5 }) },
  { file: "apple-touch-icon.png", size: 180, svg: iconSvg({ radius: 0, iconScale: 0.58 }) },
];

await mkdir("public/icons", { recursive: true });
await writeFile("public/favicon.svg", iconSvg({ radius: 112, iconScale: 0.66 }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const { file, size, svg } of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: `public/${file}`, omitBackground: true });
  console.log(`public/${file}`);
}
await browser.close();
console.log("public/favicon.svg");
