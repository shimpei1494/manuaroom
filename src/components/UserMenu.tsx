import { Group, Menu, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import Avatar from "boring-avatars";
import { useRef, useState } from "react";

import { avatarSeed, type CurrentUser, userDisplayName } from "../features/user/user-display";
import { AVATAR_COLORS } from "../theme";

/** Cloudflare Access のログアウト。Access の Cookie を消して、ログイン画面に戻る */
const ACCESS_LOGOUT_URL = "/cdn-cgi/access/logout";
/** Access がログイン中の人の情報 (Google の表示名など) を返すエンドポイント。同じオリジンで Cookie 付きで呼ぶ */
const ACCESS_IDENTITY_URL = "/cdn-cgi/access/get-identity";

async function fetchIdentityName(): Promise<string | null> {
  try {
    const response = await fetch(ACCESS_IDENTITY_URL, { credentials: "same-origin" });
    if (!response.ok) return null;
    const identity: unknown = await response.json();
    if (typeof identity === "object" && identity !== null && "name" in identity) {
      return typeof identity.name === "string" ? identity.name : null;
    }
    return null;
  } catch {
    return null;
  }
}

function UserAvatar({ user, size }: { user: CurrentUser; size: number }) {
  return (
    <Avatar size={size} name={avatarSeed(user)} variant="beam" colors={AVATAR_COLORS} aria-hidden />
  );
}

/** ヘッダー右上のアバター。押すと、ログイン中の人とログアウトのメニューが開く */
export function UserMenu({ user }: { user: CurrentUser }) {
  // 名前は Access から取るので、メニューを初めて開いたときに 1 回だけ読む
  const [identityName, setIdentityName] = useState<string | null>(null);
  const identityRequested = useRef(false);
  const displayName = userDisplayName(user, identityName);

  function handleOpen() {
    if (user.kind !== "access" || identityRequested.current) return;
    identityRequested.current = true;
    void fetchIdentityName().then(setIdentityName);
  }

  return (
    <Menu position="bottom-end" width={260} shadow="md" radius="lg" onOpen={handleOpen}>
      <Menu.Target>
        <UnstyledButton className="user-avatar-button" aria-label="ユーザーメニュー">
          <UserAvatar user={user} size={34} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Group gap="sm" wrap="nowrap" p="xs">
          <UserAvatar user={user} size={44} />
          <Stack gap={0} miw={0}>
            <Text fw={700} truncate="end" data-testid="user-menu-name">
              {displayName}
            </Text>
            <Text size="xs" c="dimmed" truncate="end" data-testid="user-menu-email">
              {user.kind === "local"
                ? "ログインなし (vp dev)"
                : (user.email ?? "メールアドレス不明")}
            </Text>
          </Stack>
        </Group>
        <Menu.Divider />
        {user.kind === "access" ? (
          <Menu.Item
            component="a"
            href={ACCESS_LOGOUT_URL}
            color="red"
            leftSection={<IconLogout size={18} stroke={1.7} />}
          >
            ログアウト
          </Menu.Item>
        ) : (
          <Menu.Item disabled leftSection={<IconLogout size={18} stroke={1.7} />}>
            ログアウト（本番のみ）
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
