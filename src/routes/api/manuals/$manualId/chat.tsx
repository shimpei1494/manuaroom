import { chatParamsFromRequest } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";

import { chatAboutManual } from "../../../../application/usecases/chat-about-manual";
import { getDeps } from "../../../../infrastructure/deps";
import { toManualChatMessages } from "../../../../server-functions/manual-chat-messages";

export const Route = createFileRoute("/api/manuals/$manualId/chat")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        // JSON 以外を断ると、別サイトのフォームからは送れなくなる (CORS の事前確認が必要になるため)。
        // server function と違い CSRF ミドルウェアの対象外なので、ここで止める
        if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
          return new Response("Unsupported Media Type", { status: 415 });
        }
        const { messages, threadId } = await chatParamsFromRequest(request);
        return chatAboutManual(getDeps(), {
          manualId: params.manualId,
          threadId,
          messages: toManualChatMessages(messages),
        });
      },
    },
  },
});
