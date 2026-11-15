import { Button, Paper, Stack } from "@mantine/core";
import { IconMap2, IconSettings } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { FloorPlan } from "../../features/home-map/FloorPlan";
import { EmptyState } from "../../features/shared/EmptyState";
import { PageHeader } from "../../features/shared/PageHeader";
import { getHomeLayoutFn } from "../../server-functions/home-layout";

export const Route = createFileRoute("/map/")({
  loader: () => getHomeLayoutFn(),
  component: MapPage,
});

function MapPage() {
  const saved = Route.useLoaderData();
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconMap2}
        title="間取り"
        description={saved?.layout.name}
        actions={
          saved && (
            <Button
              component={Link}
              to="/map/settings"
              variant="default"
              leftSection={<IconSettings size={18} />}
            >
              間取り設定
            </Button>
          )
        }
      />
      {saved ? (
        <Paper withBorder p={{ base: "xs", sm: "md" }}>
          <FloorPlan layout={saved.layout} />
        </Paper>
      ) : (
        <EmptyState
          icon={IconMap2}
          title="まだ間取りが登録されていません"
          action={
            <Button component={Link} to="/map/settings" mt="xs">
              間取りを登録する
            </Button>
          }
        >
          間取り図の画像を AI に渡して JSON を作ってもらい、「間取り設定」に貼り付けて登録します。
          家族みんなで同じ間取りを使います。
        </EmptyState>
      )}
    </Stack>
  );
}
