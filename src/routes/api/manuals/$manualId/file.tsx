import { createFileRoute } from "@tanstack/react-router";

import { getManualFile } from "../../../../application/usecases/get-manual-file";
import { getDeps } from "../../../../infrastructure/deps";

export const Route = createFileRoute("/api/manuals/$manualId/file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = await getManualFile(getDeps(), params.manualId);
        return new Response(file.body, {
          headers: {
            "Content-Type": file.contentType,
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
            "Cache-Control": "private, max-age=0, no-cache",
          },
        });
      },
    },
  },
});
