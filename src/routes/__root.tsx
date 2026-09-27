/// <reference types="vite-plus/client" />
import {
  AppShell,
  Burger,
  ColorSchemeScript,
  Group,
  MantineProvider,
  NavLink,
  Title,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import type { ReactNode } from "react";

import { ColorSchemeToggle } from "../components/ColorSchemeToggle";

import appCss from "../styles.css?url";
import mantineCss from "@mantine/core/styles.css?url";
import mantineDatesCss from "@mantine/dates/styles.css?url";
import mantineNotificationsCss from "@mantine/notifications/styles.css?url";

dayjs.locale("ja");

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
  head: () => ({
    links: [
      { href: mantineCss, rel: "stylesheet" },
      { href: mantineDatesCss, rel: "stylesheet" },
      { href: mantineNotificationsCss, rel: "stylesheet" },
      { href: appCss, rel: "stylesheet" },
    ],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "Manuaroom" },
    ],
  }),
  notFoundComponent: NotFoundComponent,
  pendingComponent: PendingComponent,
});

function RootComponent() {
  return (
    // Mantine's ColorSchemeScript runs before hydration and sets data-mantine-color-scheme on
    // <html>, which differs from what the server rendered. suppressHydrationWarning silences the
    // expected mismatch on this single attribute.
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          <DatesProvider settings={{ locale: "ja", firstDayOfWeek: 0, weekendDays: [0, 6] }}>
            <ModalsProvider labels={{ confirm: "はい", cancel: "キャンセル" }}>
              <Notifications position="top-right" />
              <Shell>
                <Outlet />
              </Shell>
            </ModalsProvider>
          </DatesProvider>
        </MantineProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>Manuaroom</Title>
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink component={Link} to="/" label="今やること" />
        <NavLink component={Link} to="/maintenance" label="メンテナンス" />
        <NavLink component={Link} to="/calendar" label="カレンダー" />
        <NavLink component={Link} to="/products" label="製品" />
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function NotFoundComponent() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>404</h1>
      <p>ページが見つかりませんでした。</p>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ color: "red" }}>エラー</h1>
      <p>{error.message}</p>
    </div>
  );
}

function PendingComponent() {
  return (
    <div style={{ padding: "1rem" }}>
      <p>読み込み中...</p>
    </div>
  );
}
