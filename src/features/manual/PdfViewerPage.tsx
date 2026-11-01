import { Alert, Box, Button, Group, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { manualFileUrl, useIsStandalone } from "./pdf-preview";

/**
 * pdf.js を読み込む。通常版は Promise.try や Map#getOrInsertComputed など新しすぎる機能を前提にしていて、
 * 少し古い iPhone で動かないので、polyfill 入りの legacy 版を使う。
 * サーバー (Workers) のバンドルに pdf.js とワーカー (計 2MB 超) が入らないよう、SSR では読み込まない。
 */
async function loadPdfjs() {
  if (import.meta.env.SSR) throw new Error("pdf.js はブラウザでだけ読み込む");
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; doc: PDFDocumentProxy; pages: { pageNumber: number; aspectRatio: number }[] };

/**
 * 説明書 PDF を pdf.js で 1 ページずつ canvas に描くページ。
 *
 * iOS Safari は iframe 内の PDF を 1 ページ目しか出さず、ホーム画面の PWA から PDF を直接開くと
 * 戻る手段がなくなる (WebKit bug 290847)。アプリ内で描けば、どの端末でも全ページを見て戻れる。
 */
export function PdfViewerPage({
  manualId,
  fileName,
  productId,
}: {
  manualId: string;
  fileName?: string;
  productId?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const standalone = useIsStandalone();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const fileUrl = manualFileUrl(manualId);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]> | undefined;
    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        loadingTask = pdfjs.getDocument({ url: fileUrl, withCredentials: true });
        const doc = await loadingTask.promise;
        const pages = await Promise.all(
          Array.from({ length: doc.numPages }, async (_, i) => {
            const page = await doc.getPage(i + 1);
            const { width, height } = page.getViewport({ scale: 1 });
            return { pageNumber: i + 1, aspectRatio: width / height };
          }),
        );
        if (!cancelled) setState({ kind: "ready", doc, pages });
      } catch (e) {
        console.error("PDF の読み込みに失敗しました", e);
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [fileUrl]);

  const goBack = () => {
    if (canGoBack) {
      router.history.back();
    } else if (productId) {
      void navigate({ to: "/products/$productId", params: { productId } });
    } else {
      void navigate({ to: "/products" });
    }
  };

  return (
    <Stack gap="sm">
      {/* スクロールしても「戻る」に手が届くよう、ヘッダーの下に貼り付ける */}
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="xs"
        pos="sticky"
        py={4}
        style={{
          top: "var(--app-shell-header-height, 0px)",
          zIndex: 2,
          background: "var(--mantine-color-body)",
        }}
      >
        <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={goBack} px="xs">
          戻る
        </Button>
        {/* ホーム画面の PWA で別タブに開くと戻れなくなるので、ブラウザのときだけ出す */}
        {!standalone && (
          <Button
            component="a"
            href={fileUrl}
            target="_blank"
            rel="noopener"
            variant="subtle"
            size="xs"
            leftSection={<IconExternalLink size={14} />}
          >
            新しいタブで開く
          </Button>
        )}
      </Group>
      {fileName && (
        <Title order={2} size="h4" lineClamp={2} style={{ wordBreak: "break-all" }}>
          {fileName}
        </Title>
      )}

      {state.kind === "loading" && (
        <Group justify="center" py="xl">
          <Loader />
          <Text c="dimmed">PDF を読み込み中…</Text>
        </Group>
      )}
      {state.kind === "error" && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="PDF を表示できませんでした"
        >
          ファイルが壊れているか、読み込みに失敗しました。時間をおいて開き直してください。
        </Alert>
      )}
      {state.kind === "ready" && (
        <Stack gap="sm" aria-label="PDF のページ">
          {state.pages.map((page) => (
            <PdfPage
              key={page.pageNumber}
              doc={state.doc}
              pageNumber={page.pageNumber}
              aspectRatio={page.aspectRatio}
            />
          ))}
          <Text size="xs" c="dimmed" ta="center">
            全 {state.pages.length.toString()} ページ
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

/** 画面に近づいたページだけ描く。何百ページもある説明書でもメモリを食いつぶさないように、遠ざかったら消す。 */
function PdfPage({
  doc,
  pageNumber,
  aspectRatio,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  aspectRatio: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setNear(entry.isIntersecting);
      },
      { rootMargin: "150% 0px" },
    );
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    if (!near) return;
    let cancelled = false;
    let task: ReturnType<PDFPageProxy["render"]> | undefined;
    void (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      // 拡大しても文字が読めるよう、画面の解像度の 2 倍 (上限 3 倍) で描く
      const pixelRatio = Math.min((window.devicePixelRatio || 1) * 2, 3);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (box.clientWidth / base.width) * pixelRatio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      try {
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // 画面から外れて描画を取り消したとき
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      // 画面から遠ざかったら canvas のメモリを手放す
      canvas.width = 0;
      canvas.height = 0;
      setRendered(false);
    };
  }, [doc, pageNumber, near]);

  return (
    <Paper
      ref={boxRef}
      withBorder
      radius="sm"
      style={{ overflow: "hidden", aspectRatio: aspectRatio.toString(), position: "relative" }}
      bg="white"
    >
      <canvas
        ref={canvasRef}
        aria-label={`${pageNumber.toString()} ページ目`}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {!rendered && (
        <Box
          pos="absolute"
          inset={0}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Text size="xs" c="dimmed">
            {pageNumber.toString()}
          </Text>
        </Box>
      )}
    </Paper>
  );
}
