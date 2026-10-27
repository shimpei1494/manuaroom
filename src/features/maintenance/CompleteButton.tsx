import { Button, type ButtonProps } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { markMaintenanceDoneFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";
import { showRecordedNotification } from "./show-recorded-notification";

/** 今日実施したものとして記録し、画面を再読み込みする。 */
export function CompleteButton({
  taskId,
  size = "xs",
  variant = "light",
}: {
  taskId: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const markDone = useServerFn(markMaintenanceDoneFn);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant={variant}
      loading={busy}
      leftSection={<IconCheck size={size === "xs" ? 14 : 18} stroke={2.2} />}
      onClick={async () => {
        setBusy(true);
        try {
          const { log } = await markDone({ data: { taskId } });
          showRecordedNotification("完了を記録しました", log.id);
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "完了に失敗しました",
            message: errorMessage(e),
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
