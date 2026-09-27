import { Button, type ButtonProps } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { undoMaintenanceLogFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";

/** 実施・スキップの記録を取り消し、タスクを記録前の状態に戻す。 */
export function UndoLogButton({
  logId,
  onUndone,
  size = "xs",
}: {
  logId: string;
  onUndone?: () => void;
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const undo = useServerFn(undoMaintenanceLogFn);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant="subtle"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await undo({ data: { logId } });
          notifications.show({ color: "gray", message: "取り消しました" });
          onUndone?.();
          await router.invalidate();
        } catch (e) {
          notifications.show({
            color: "red",
            title: "取り消しに失敗しました",
            message: errorMessage(e),
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      元に戻す
    </Button>
  );
}
