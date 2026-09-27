import { Button, type ButtonProps } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { markMaintenanceDoneFn } from "../../server-functions/maintenance-tasks";

/** 今日実施したものとして記録し、画面を再読み込みする。 */
export function CompleteButton({
  taskId,
  size = "xs",
}: {
  taskId: string;
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const markDone = useServerFn(markMaintenanceDoneFn);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant="light"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await markDone({ data: { taskId } });
          notifications.show({ color: "green", message: "完了を記録しました" });
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "完了に失敗しました",
            message: e instanceof Error ? e.message : String(e),
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      完了
    </Button>
  );
}
