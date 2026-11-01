import {
  ActionIcon,
  Alert,
  Box,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Typography,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowDown,
  IconArrowUp,
  IconMessageChatbot,
  IconPlayerStopFilled,
} from "@tabler/icons-react";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remend from "remend";

import type { Manual } from "../../domain/manual/manual";

/** 説明書 1 冊について AI に質問する (ADR 0008)。会話は閉じると消える。 */
export function ManualChatDrawer({
  manual,
  productName,
  opened,
  onClose,
}: {
  manual: Manual;
  productName: string;
  opened: boolean;
  onClose: () => void;
}) {
  // スマホでは全画面にして、入力欄を画面の下に固定する
  const isMobile = useMediaQuery("(max-width: 48em)");
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={isMobile ? "100%" : "lg"}
      title={
        <Stack gap={0}>
          <Text fw={700} ff="heading">
            {productName}に質問
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {manual.fileName}
          </Text>
        </Stack>
      }
      styles={{
        content: { display: "flex", flexDirection: "column" },
        body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: 0 },
      }}
    >
      {opened && <ManualChat manualId={manual.id} />}
    </Drawer>
  );
}

/** 一番下からこの距離 (px) 以内にいれば、新しい回答に合わせて自動で下までスクロールする */
const STICK_THRESHOLD = 80;

function ManualChat({ manualId }: { manualId: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents(`/api/manuals/${manualId}/chat`),
    threadId: `manual-${manualId}`,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  // 自動スクロールするかどうか (描画には使わないので ref) と、「最新へ」ボタンを出すかどうか
  const stickRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    viewport?.scrollTo({ top: viewport.scrollHeight });
  };

  // 読み返していない (一番下にいる) ときだけ、届いた回答を追いかける
  useEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    void sendMessage(text);
    setInput("");
    stickRef.current = true;
  };

  const last = messages.at(-1);
  const waitingFirstToken = isLoading && (!last || last.role === "user" || !messageText(last));

  return (
    <>
      <Box pos="relative" flex={1} mih={0}>
        <ScrollArea
          h="100%"
          viewportRef={viewportRef}
          onScrollPositionChange={({ y }) => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            const nearBottom = viewport.scrollHeight - viewport.clientHeight - y < STICK_THRESHOLD;
            stickRef.current = nearBottom;
            setAtBottom(nearBottom);
          }}
        >
          <Stack gap="lg" p="md" aria-live="polite">
            {messages.length === 0 && <ChatEmptyState />}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {waitingFirstToken && (
              <Group gap="xs">
                <Loader type="dots" size="sm" />
                <Text size="sm" c="dimmed">
                  説明書を読んでいます…
                </Text>
              </Group>
            )}
            {error && (
              <Alert color="red" title="回答を取得できませんでした">
                {error.message}
              </Alert>
            )}
          </Stack>
        </ScrollArea>
        {!atBottom && (
          <ActionIcon
            aria-label="最新の回答へ"
            variant="default"
            radius="xl"
            size="lg"
            pos="absolute"
            bottom={12}
            left="50%"
            style={{ transform: "translateX(-50%)", boxShadow: "var(--mantine-shadow-sm)" }}
            onClick={() => {
              scrollToBottom();
            }}
          >
            <IconArrowDown size={18} />
          </ActionIcon>
        )}
      </Box>
      <Box className="chat-composer" px="md" pt="sm">
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Textarea
            flex={1}
            aria-label="質問"
            placeholder="例: フィルターの外し方は？"
            radius="xl"
            autosize
            minRows={1}
            maxRows={5}
            value={input}
            onChange={(e) => {
              setInput(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {isLoading ? (
            <ActionIcon aria-label="止める" variant="default" radius="xl" size={44} onClick={stop}>
              <IconPlayerStopFilled size={18} />
            </ActionIcon>
          ) : (
            <ActionIcon
              aria-label="送信"
              radius="xl"
              size={44}
              disabled={!input.trim()}
              onClick={handleSubmit}
            >
              <IconArrowUp size={22} />
            </ActionIcon>
          )}
        </Group>
      </Box>
    </>
  );
}

function ChatEmptyState() {
  return (
    <Stack align="center" gap="xs" py="xl" ta="center">
      <ThemeIcon size={56} radius="xl" variant="light" color="violet">
        <IconMessageChatbot size={30} />
      </ThemeIcon>
      <Text fw={700} ff="heading">
        説明書について聞いてみましょう
      </Text>
      <Text size="sm" c="dimmed">
        お手入れの方法やエラー表示の意味など、説明書の内容について質問できます。
      </Text>
    </Stack>
  );
}

function messageText(message: UIMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}

function ChatMessage({ message }: { message: UIMessage }) {
  const text = messageText(message);
  if (!text) return null;

  // 自分の質問は右寄せの吹き出し、AI の回答は吹き出しなしで横幅いっぱいに読み物として出す
  if (message.role === "user") {
    return (
      <Paper
        radius="lg"
        px="md"
        py="xs"
        maw="85%"
        ml="auto"
        bg="var(--mantine-primary-color-light)"
        style={{ borderBottomRightRadius: 4 }}
      >
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Text>
      </Paper>
    );
  }
  return <AnswerMarkdown text={text} />;
}

/** 回答の中のリンクは別タブで開く (チャットを閉じないため) */
function AnswerLink({ href, children }: ComponentProps<"a">) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

const MARKDOWN_COMPONENTS: Components = { a: AnswerLink };

/** AI の回答 (Markdown) を整えて表示する。届いている途中の閉じていない記法は remend で補う。 */
function AnswerMarkdown({ text }: { text: string }) {
  return (
    <Typography className="chat-answer">
      <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {remend(text)}
      </Markdown>
    </Typography>
  );
}
