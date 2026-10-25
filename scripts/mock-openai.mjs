// OpenAI のキーなしで AI 解析と説明書チャットをローカルで試すためのモック (ADR 0008)。
// `.dev.vars` に OPENAI_BASE_URL=http://127.0.0.1:4010/v1 と適当な OPENAI_API_KEY を書いてから
// `vp run mock:openai` と `vp dev` を並べて起動する。Responses API のストリーミングだけを真似る。
import http from "node:http";

const PORT = 4010;

const EXTRACTION_RESULT = JSON.stringify({
  maintenances: [
    {
      title: "フィルター清掃",
      intervalValue: 2,
      intervalUnit: "week",
      memo: "モックの回答です",
      sourcePage: 12,
      url: null,
    },
  ],
});
const CHAT_ANSWER = ["（モック）", "フィルターは", "2週間に1回", "掃除してください", " (p.12)"];

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const request = JSON.parse(body || "{}");
      const structured = Boolean(request.text?.format);
      console.log(`${req.method} ${req.url} ${structured ? "解析" : "チャット"}`);

      const pieces = structured
        ? [EXTRACTION_RESULT.slice(0, 30), EXTRACTION_RESULT.slice(30)]
        : CHAT_ANSWER;
      const response = { id: "resp_mock", object: "response", model: request.model, output: [] };
      const send = (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);

      res.writeHead(200, { "content-type": "text/event-stream" });
      send({ type: "response.created", response: { ...response, status: "in_progress" } });
      let i = 0;
      const timer = setInterval(() => {
        if (i < pieces.length) {
          send({
            type: "response.output_text.delta",
            item_id: "msg_mock",
            output_index: 0,
            content_index: 0,
            delta: pieces[i],
          });
          i++;
          return;
        }
        clearInterval(timer);
        send({
          type: "response.completed",
          response: {
            ...response,
            status: "completed",
            output: [
              {
                type: "message",
                id: "msg_mock",
                role: "assistant",
                status: "completed",
                content: [{ type: "output_text", text: pieces.join(""), annotations: [] }],
              },
            ],
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          },
        });
        res.end();
      }, 300);
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`mock OpenAI: http://127.0.0.1:${PORT}/v1`);
  });
