import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconBrandYoutube,
  IconDots,
  IconExternalLink,
  IconLink,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { productLinkHostname, type ProductLink } from "../../domain/product/product-link";
import { deleteProductLinkFn } from "../../server-functions/product-links";
import { EmptyState } from "../shared/EmptyState";
import { errorMessage } from "../shared/form";
import { SectionTitle } from "../shared/SectionTitle";
import { ProductLinkForm } from "./ProductLinkForm";

/** 公式ページやサポート FAQ など、説明書以外の資料へのリンク。タップで別タブに開く。 */
export function ProductLinksSection({
  productId,
  links,
}: {
  productId: string;
  links: ProductLink[];
}) {
  const [createOpened, createDisclosure] = useDisclosure(false);
  const [editingLink, setEditingLink] = useState<ProductLink | null>(null);

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <SectionTitle icon={IconLink} color="apricot">
          関連リンク
        </SectionTitle>
        <Button
          variant="light"
          onClick={createDisclosure.open}
          leftSection={<IconPlus size={18} />}
        >
          リンクを追加
        </Button>
      </Group>

      {links.length === 0 ? (
        <EmptyState compact icon={IconLink} color="apricot" title="まだリンクがありません">
          公式ページやサポート情報、交換部品の購入ページなどの URL を残しておけます。
        </EmptyState>
      ) : (
        <Stack gap="xs">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onEdit={() => {
                setEditingLink(link);
              }}
            />
          ))}
        </Stack>
      )}

      <Modal opened={createOpened} onClose={createDisclosure.close} title="関連リンクを追加">
        <ProductLinkForm mode="create" productId={productId} onDone={createDisclosure.close} />
      </Modal>
      <Modal
        opened={editingLink !== null}
        onClose={() => {
          setEditingLink(null);
        }}
        title="関連リンクを編集"
      >
        {editingLink && (
          <ProductLinkForm
            mode="edit"
            link={editingLink}
            onDone={() => {
              setEditingLink(null);
            }}
          />
        )}
      </Modal>
    </Stack>
  );
}

function LinkRow({ link, onEdit }: { link: ProductLink; onEdit: () => void }) {
  const router = useRouter();
  const deleteLink = useServerFn(deleteProductLinkFn);
  const hostname = productLinkHostname(link.url);
  const LinkIcon =
    hostname === "youtube.com" || hostname === "youtu.be" ? IconBrandYoutube : IconLink;

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "リンクを削除",
      centered: true,
      children: <Text size="sm">「{link.title}」を削除します。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteLink({ data: { linkId: link.id } });
          notifications.show({ color: "green", message: "リンクを削除しました" });
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "削除に失敗しました",
            message: errorMessage(e),
          });
        }
      },
    });
  };

  return (
    <Paper withBorder p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon size={36} radius="md" variant="light" color="apricot">
          <LinkIcon size={20} stroke={1.6} />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Anchor
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            style={{ overflowWrap: "anywhere" }}
          >
            {link.title}
            <IconExternalLink
              size={14}
              stroke={1.8}
              style={{ marginLeft: 4, verticalAlign: "-2px" }}
              aria-hidden
            />
          </Anchor>
          {link.description && (
            <Text size="sm" c="dimmed" lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
              {link.description}
            </Text>
          )}
          {hostname && (
            <Text size="xs" c="dimmed">
              {hostname}
            </Text>
          )}
        </Stack>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={`${link.title} の操作`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={onEdit}>
              編集
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
              削除
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Paper>
  );
}
