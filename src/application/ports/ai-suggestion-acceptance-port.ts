import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";

/**
 * AI Suggestion の承認 (候補を accepted にする + タスクを作る) を、切り離せない 1 つの操作として行う。
 * 候補ごとに「まだ pending なら accepted にしてタスクを作る」。他の操作が先に判断済みにした候補は飛ばす。
 * 全件を 1 トランザクションで書くので、途中で失敗したときは何も書かれない。
 */
export type AiSuggestionAcceptancePort = {
  /** 作ったタスクの id を返す (飛ばした候補のタスクは含まない)。 */
  accept(input: {
    userId: string;
    items: { suggestionId: string; task: MaintenanceTask }[];
  }): Promise<string[]>;
};
