import {
  Alert,
  Anchor,
  Button,
  CopyButton,
  Group,
  List,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconEye,
  IconListNumbers,
  IconSettings,
} from "@tabler/icons-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { parseHomeLayoutJson, type SavedHomeLayout } from "../../domain/home-map/home-layout";
import { FloorPlan } from "../../features/home-map/FloorPlan";
import { formatLayoutJson } from "../../features/home-map/format-layout-json";
import { HOME_LAYOUT_PROMPT } from "../../features/home-map/layout-prompt";
import { SAMPLE_HOME_LAYOUT } from "../../features/home-map/sample-layout";
import { errorMessage } from "../../features/shared/form";
import { PageHeader } from "../../features/shared/PageHeader";
import { SectionTitle } from "../../features/shared/SectionTitle";
import { getHomeLayoutFn, saveHomeLayoutFn } from "../../server-functions/home-layout";

export const Route = createFileRoute("/map/settings")({
  loader: () => getHomeLayoutFn(),
  component: MapSettingsPage,
});

function MapSettingsPage() {
  const saved = Route.useLoaderData();
  // 前に開いたときの読み込み結果が先に出て、あとから最新に置き換わることがあるので、
  // 保存済みの間取りが変わったら入力欄を作り直す
  return <LayoutEditor key={saved?.updatedAt.getTime() ?? "none"} saved={saved} />;
}

function LayoutEditor({ saved }: { saved: SavedHomeLayout | null }) {
  const navigate = useNavigate();
  const save = useServerFn(saveHomeLayoutFn);
  const [text, setText] = useState(saved ? formatLayoutJson(saved.layout) : "");
  const [saving, setSaving] = useState(false);
  const parsed = text.trim() === "" ? null : parseHomeLayoutJson(text);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ data: { layoutJson: text } });
      notifications.show({ color: "green", message: "間取りを保存しました" });
      await navigate({ to: "/map" });
    } catch (e) {
      notifications.show({ color: "red", title: "保存に失敗しました", message: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Anchor component={Link} to="/map" size="sm" style={{ alignSelf: "flex-start" }}>
        <Group gap={4} wrap="nowrap">
          <IconArrowLeft size={16} />
          間取りへ
        </Group>
      </Anchor>
      <PageHeader
        icon={IconSettings}
        title="間取り設定"
        description="家族みんなで同じ間取りを使います"
      />
      <Paper withBorder p="md">
        <Stack gap="sm">
          <SectionTitle icon={IconListNumbers}>登録のしかた</SectionTitle>
          <List type="ordered" size="sm" spacing={4}>
            <List.Item>「AI への指示をコピー」を押す</List.Item>
            <List.Item>
              Claude や ChatGPT に、賃貸の間取り図の画像と、コピーした指示を貼り付けて送る
            </List.Item>
            <List.Item>返ってきた JSON を下の欄に貼り付け、プレビューを確かめて保存する</List.Item>
          </List>
          <Group gap="xs">
            <CopyButton value={HOME_LAYOUT_PROMPT}>
              {({ copied, copy }) => (
                <Button
                  onClick={copy}
                  color={copied ? "teal" : undefined}
                  leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                >
                  {copied ? "コピーしました" : "AI への指示をコピー"}
                </Button>
              )}
            </CopyButton>
            <Button
              variant="default"
              onClick={() => {
                setText(formatLayoutJson(SAMPLE_HOME_LAYOUT));
              }}
            >
              サンプルを入れる
            </Button>
          </Group>
        </Stack>
      </Paper>
      <Textarea
        label="間取りの JSON"
        description="単位は cm、左上が原点です。保存すると前の間取りは置き換わります。"
        placeholder='{ "version": 1, "rooms": [ ... ] }'
        autosize
        minRows={8}
        maxRows={18}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
        value={text}
        onChange={(e) => {
          setText(e.currentTarget.value);
        }}
      />
      {parsed && !parsed.ok && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="この JSON はまだ保存できません"
        >
          <List size="sm" spacing={2}>
            {parsed.errors.slice(0, 10).map((error) => (
              <List.Item key={error}>{error}</List.Item>
            ))}
          </List>
          {parsed.errors.length > 10 && (
            <Text size="sm" mt={4}>
              ほか {(parsed.errors.length - 10).toString()} 件
            </Text>
          )}
        </Alert>
      )}
      {parsed?.ok && (
        <Stack gap="sm">
          <SectionTitle icon={IconEye}>プレビュー</SectionTitle>
          <Paper withBorder p={{ base: "xs", sm: "md" }}>
            <FloorPlan layout={parsed.layout} />
          </Paper>
        </Stack>
      )}
      <Group justify="flex-end">
        <Button
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!parsed?.ok}
          leftSection={<IconDeviceFloppy size={18} />}
        >
          保存
        </Button>
      </Group>
    </Stack>
  );
}
