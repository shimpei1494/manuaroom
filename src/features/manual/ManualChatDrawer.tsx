import {
  Alert,
  Button,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { useState } from "react";

import type { Manual } from "../../domain/manual/manual";

/** 説明書 1 冊について AI に質問する (ADR 0008)。会話は閉じると消える。 */
export function ManualChatDrawer({
  manual,
  opened,
  onClose,
}: {
  manual: Manual;
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={`「${manual.fileName}」に質問`}
    >
      {opened && <ManualChat manualId={manual.id} />}
    </Drawer>
  );
}

function ManualChat({ manualId }: { manualId: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents(`/api/manuals/${manualId}/chat`),
    threadId: `manual-${manualId}`,
  });

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    void sendMessage(text);
    setInput("");
  };

  return (
    <Stack gap="sm">
      <ScrollArea.Autosize mah="calc(100dvh - 240px)">
        <Stack gap="xs">
          {messages.length === 0 && (
            <Text size="sm" c="dimmed">
              お手入れの方法やエラー表示の意味など、説明書の内容について質問できます。
            </Text>
          )}
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </Stack>
      </ScrollArea.Autosize>
      {error && (
        <Alert color="red" title="回答を取得できませんでした">
          {error.message}
        </Alert>
      )}
      <Textarea
        aria-label="質問"
        placeholder="例: フィルターの外し方は？"
        autosize
        minRows={2}
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
      <Group justify="flex-end">
        {isLoading ? (
          <Button variant="default" onClick={stop}>
            止める
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!input.trim()}>
            送信
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .flatMap((part) => (part.type === "text" ? [part.content] : []))
    .join("");
  if (!text) return null;
  const isUser = message.role === "user";
  return (
    <Paper
      withBorder={!isUser}
      bg={isUser ? "blue.0" : undefined}
      p="xs"
      maw="85%"
      ml={isUser ? "auto" : undefined}
    >
      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
        {text}
      </Text>
    </Paper>
  );
}
