/* oxlint-disable react-doctor/async-await-in-loop, react-doctor/async-parallel -- 画面操作は利用者と同じ順番で 1 つずつ行う。並列にしない */
// 検証用に起動した manuaroom を、利用者と同じ画面操作で動かして証拠を残す。
// 使い方 (リポジトリのルートで): node .claude/skills/verify-manuaroom/scripts/drive.mjs <journey>
//   journey: tasks | skip-history | calendar | manual-ai | product-from-manual | all
// 証拠は .wrangler/verify-evidence/<日時>/ に置く (後片付けでは消えない)。失敗したら終了コード 1。
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium, expect } from "@playwright/test";

const PORT = process.env.VERIFY_PORT ?? "3101";
const BASE_URL = `http://localhost:${PORT}`;
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const EVIDENCE_DIR = join(".wrangler", "verify-evidence", RUN_ID);
const VIEWPORTS = { desktop: { width: 1280, height: 800 }, mobile: { width: 412, height: 915 } };

// サーバーが PDF として受け取れる最小の PDF。モック AI は中身を見ない。
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
);

async function open(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
}

async function shot(page, name) {
  await page.screenshot({ path: join(EVIDENCE_DIR, `${name}.png`), fullPage: true });
}

async function createProduct(page) {
  const productName = `検証製品 ${crypto.randomUUID().slice(0, 8)}`;
  await open(page, "/products/new");
  await page.getByLabel("製品名").fill(productName);
  // 「説明書 PDF から登録」のボタンがあり、スマホ幅では開発用 Router Devtools のボタンが
  // 「登録」に重なるので、手入力フォームは Enter で送信する (e2e/maintenance-flow.spec.ts と同じ)
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  return productName;
}

async function createProductWithTask(page, { interval }) {
  const productName = await createProduct(page);
  await page.getByRole("button", { name: "タスクを追加" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("フィルター掃除");
  await dialog.getByLabel("周期").fill(interval.toString());
  await dialog.getByLabel("単位").click();
  await page.getByRole("option", { name: "日", exact: true }).click();
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText("タスクを追加しました")).toBeVisible();
  return productName;
}

const journeys = {
  // 製品 → タスク追加 → 「今やること」から完了 → 通知から元に戻す
  async tasks(page) {
    const productName = await createProductWithTask(page, { interval: 3 });
    await open(page, "/");
    const card = page.locator(".mantine-Card-root", { hasText: productName });
    await expect(card).toContainText("あと3日");
    await shot(page, "tasks-1-today");

    await card.getByRole("button", { name: "完了" }).click();
    const notice = page.locator(".mantine-Notification-root", { hasText: "完了を記録しました" });
    await expect(notice).toBeVisible();
    await shot(page, "tasks-2-done");

    await notice.getByRole("button", { name: "元に戻す" }).click();
    await expect(page.getByText("取り消しました")).toBeVisible();
    await shot(page, "tasks-3-undone");
  },

  // スキップすると回数が出て、履歴から取り消せる (ADR 0006)
  async "skip-history"(page) {
    await createProductWithTask(page, { interval: 3 });
    const row = page.getByRole("row", { name: /フィルター掃除/ });
    await row.getByRole("button", { name: "スキップ" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "スキップする" }).click();
    await expect(row).toContainText("1回スキップ中");
    await shot(page, "skip-1-skipped");

    await row.getByRole("button", { name: "履歴" }).click();
    const history = page.getByRole("dialog", { name: /履歴/ });
    await expect(history).toContainText("スキップ");
    await history.getByRole("button", { name: "元に戻す" }).click();
    await expect(history).toContainText("まだ記録がありません");
    await shot(page, "skip-2-history-undone");
  },

  // 完了した日がカレンダーの今日の欄に「実施」で出る
  async calendar(page) {
    const productName = await createProductWithTask(page, { interval: 1 });
    await page
      .getByRole("row", { name: /フィルター掃除/ })
      .getByRole("button", { name: "完了" })
      .click();
    await expect(page.getByText("完了を記録しました")).toBeVisible();

    await open(page, "/calendar");
    await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
    const detail = page.locator(".mantine-Card-root", { hasText: productName });
    await expect(detail).toContainText("実施");
    await shot(page, "calendar-1-today");
  },

  // 説明書アップロード → AI 解析 (モック) → 候補を承認 → タスクになる → 説明書に質問 → 削除 (ADR 0008)
  async "manual-ai"(page) {
    await createProduct(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "verify-manual.pdf",
      mimeType: "application/pdf",
      buffer: MINIMAL_PDF,
    });
    await page.getByRole("button", { name: "アップロード", exact: true }).click();
    await expect(page.getByText("説明書をアップロードしました")).toBeVisible();
    await expect(page.getByText("verify-manual.pdf").first()).toBeVisible();
    await shot(page, "manual-1-uploaded");

    await page.getByRole("button", { name: "AIで解析" }).click();
    await expect(page.getByText("1 件の候補が抽出されました")).toBeVisible();
    await expect(page.getByText("フィルター清掃")).toBeVisible();
    await shot(page, "manual-2-analyzed");

    await page.getByRole("button", { name: "承認" }).click();
    await expect(page.getByText("候補をメンテナンスタスクに登録しました")).toBeVisible();
    await expect(page.getByRole("row", { name: /フィルター清掃/ })).toBeVisible();
    await shot(page, "manual-3-accepted");

    await page.getByRole("button", { name: "質問する" }).click();
    const drawer = page.getByRole("dialog", { name: /に質問/ });
    await drawer.getByLabel("質問").fill("フィルターの掃除頻度は?");
    await drawer.getByRole("button", { name: "送信" }).click();
    await expect(drawer).toContainText("（モック）フィルターは2週間に1回掃除してください (p.12)");
    await shot(page, "manual-4-chat");
    await page.keyboard.press("Escape");

    // 「削除」は製品・タスク・説明書にあるので、説明書のカードの中に絞る
    await page
      .locator(".mantine-Card-root", { hasText: "verify-manual.pdf" })
      .getByRole("button", { name: "削除", exact: true })
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "削除", exact: true }).click();
    await expect(page.getByText("説明書を削除しました")).toBeVisible();
    await shot(page, "manual-5-deleted");
  },

  // 説明書 PDF を選ぶだけで、AI (モック) が読み取った内容で製品が登録され、説明書も保存される (ADR 0008)
  async "product-from-manual"(page) {
    await open(page, "/products/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "verify-manual.pdf",
      mimeType: "application/pdf",
      buffer: MINIMAL_PDF,
    });
    await shot(page, "product-from-manual-1-selected");

    await page.getByRole("button", { name: "PDF から登録" }).click();
    await expect(page.getByText("「ルームエアコン（モック）」を登録しました")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ルームエアコン（モック）" })).toBeVisible();
    // モックが返したメーカー・型番・カテゴリが製品に入っている
    await expect(page.getByText("モック電機").first()).toBeVisible();
    await expect(page.getByText("MOCK-2026").first()).toBeVisible();
    await expect(page.getByText("エアコン").first()).toBeVisible();
    // 説明書も一緒に保存されている
    await expect(page.getByText("verify-manual.pdf").first()).toBeVisible();
    await shot(page, "product-from-manual-2-created");
  },
};

async function main() {
  const requested = process.argv[2];
  const names = requested === "all" ? Object.keys(journeys) : [requested];
  if (!requested || names.some((name) => !(name in journeys))) {
    console.error(`usage: drive.mjs <${[...Object.keys(journeys), "all"].join("|")}>`);
    process.exit(2);
  }
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const browser = await chromium.launch();
  let failed = false;
  try {
    for (const name of names) {
      for (const [device, viewport] of Object.entries(VIEWPORTS)) {
        const context = await browser.newContext({
          viewport,
          timezoneId: "Asia/Tokyo",
          locale: "ja-JP",
        });
        const page = await context.newPage();
        try {
          await journeys[name](page);
          console.log(`PASS ${name} (${device})`);
        } catch (error) {
          failed = true;
          await shot(page, `FAIL-${name}-${device}`).catch(() => {});
          console.error(`FAIL ${name} (${device}): ${error.message.split("\n")[0]}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`evidence: ${EVIDENCE_DIR}`);
  process.exit(failed ? 1 : 0);
}

await main();
