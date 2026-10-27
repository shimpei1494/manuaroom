/// <reference types="vite-plus/client" />
import {
  AppShell,
  Button,
  ColorSchemeScript,
  Group,
  Loader,
  MantineProvider,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconChecklist,
  IconMapQuestion,
  IconPackage,
  IconTool,
  type Icon,
} from "@tabler/icons-react";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import type { ReactNode } from "react";

import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import { Logo } from "../components/Logo";
import { theme } from "../theme";

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
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      { href: "https://fonts.gstatic.com", rel: "preconnect", crossOrigin: "anonymous" },
      {
        href: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap",
        rel: "stylesheet",
      },
      { href: mantineCss, rel: "stylesheet" },
      { href: mantineDatesCss, rel: "stylesheet" },
      { href: mantineNotificationsCss, rel: "stylesheet" },
      { href: appCss, rel: "stylesheet" },
    ],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1, viewport-fit=cover", name: "viewport" },
      { content: "#22a77f", name: "theme-color" },
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
        <MantineProvider theme={theme} defaultColorScheme="auto">
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

const NAV_ITEMS: { to: string; label: string; shortLabel: string; icon: Icon }[] = [
  { to: "/", label: "今やること", shortLabel: "今やること", icon: IconChecklist },
  { to: "/maintenance", label: "メンテナンス", shortLabel: "メンテ", icon: IconTool },
  { to: "/calendar", label: "カレンダー", shortLabel: "カレンダー", icon: IconCalendarEvent },
  { to: "/products", label: "製品", shortLabel: "製品", icon: IconPackage },
];

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

// PC は左のサイドバー、スマホは親指で押しやすい下のタブバーで移動する
function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 232, breakpoint: "sm", collapsed: { mobile: true } }}
      footer={{ height: { base: 64, sm: 0 } }}
      padding={{ base: "md", sm: "xl" }}
    >
      <AppShell.Header className="app-header">
        <Group h="100%" px="md" justify="space-between">
          <Logo />
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" className="app-navbar">
        <Stack gap={4}>
          {NAV_ITEMS.map(({ to, label, icon: ItemIcon }) => (
            <NavLink
              key={to}
              component={Link}
              to={to}
              label={label}
              active={isActive(pathname, to)}
              variant="light"
              leftSection={<ItemIcon size={20} stroke={1.7} />}
              className="nav-link"
            />
          ))}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main className="app-main">
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </AppShell.Main>
      <AppShell.Footer hiddenFrom="sm" className="tab-bar">
        <Group h="100%" grow gap={0} wrap="nowrap">
          {NAV_ITEMS.map(({ to, shortLabel, icon: ItemIcon }) => {
            const active = isActive(pathname, to);
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                className="tab-bar-item"
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
              >
                <ItemIcon size={24} stroke={active ? 2 : 1.6} />
                <span>{shortLabel}</span>
              </UnstyledButton>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <Stack align="center" justify="center" gap="sm" py={64} ta="center">
      {children}
    </Stack>
  );
}

function NotFoundComponent() {
  return (
    <CenteredMessage>
      <ThemeIcon size={72} radius="xl" variant="light" className="float">
        <IconMapQuestion size={40} stroke={1.5} />
      </ThemeIcon>
      <Title order={2}>ページが見つかりませんでした</Title>
      <Text c="dimmed">URL が間違っているか、削除された可能性があります。</Text>
      <Button component={Link} to="/" mt="sm">
        今やることへ戻る
      </Button>
    </CenteredMessage>
  );
}

function ErrorComponent({ error }: ErrorComponentProps) {
  return (
    <CenteredMessage>
      <ThemeIcon size={72} radius="xl" variant="light" color="red">
        <IconAlertTriangle size={40} stroke={1.5} />
      </ThemeIcon>
      <Title order={2}>エラーが起きました</Title>
      <Text c="dimmed">{error instanceof Error ? error.message : String(error)}</Text>
      <Button component={Link} to="/" mt="sm" variant="light">
        今やることへ戻る
      </Button>
    </CenteredMessage>
  );
}

function PendingComponent() {
  return (
    <CenteredMessage>
      <Loader type="dots" />
      <Text size="sm" c="dimmed">
        読み込み中...
      </Text>
    </CenteredMessage>
  );
}
