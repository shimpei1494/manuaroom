import { Button, type ButtonProps } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { undoMaintenanceLogFn } from "../../server-functions/maintenance-tasks";
import { errorMessage } from "../shared/form";

/**
 * 実施・スキップの記録を取り消し、タスクを記録前の状態に戻す。
 * 複数渡したとき (まとめてスキップ) は並行して取り消す。どれも別々のタスクの最新の記録なので、互いに影響しない。
 */
export function UndoLogButton({
  logIds,
  onUndone,
  size = "xs",
}: {
  logIds: readonly string[];
  onUndone?: () => void;
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const undo = useServerFn(undoMaintenanceLogFn);
  const [busy, setBusy] = useState(false);

  const undoAll = async () => {
    const results = await Promise.allSettled(logIds.map((logId) => undo({ data: { logId } })));
    const failed = results.filter((r) => r.status === "rejected");
    return { undoneCount: results.length - failed.length, firstFailure: failed[0] };
  };

  return (
    <Button
      size={size}
      variant="subtle"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { undoneCount, firstFailure } = await undoAll();
          if (firstFailure === undefined) {
            notifications.show({ color: "gray", message: "取り消しました" });
            onUndone?.();
          } else {
            notifications.show({
              color: "red",
              title:
                undoneCount === 0
                  ? "取り消しに失敗しました"
                  : `${logIds.length.toString()} 件中 ${undoneCount.toString()} 件を取り消しました`,
              message: errorMessage(firstFailure.reason),
            });
          }
          await router.invalidate();
        } finally {
          setBusy(false);
        }
      }}
    >
      元に戻す
    </Button>
  );
}
