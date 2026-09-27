/** 指定された ID のエンティティが (そのユーザーの範囲で) 見つからない。 */
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/** 業務ルール上できない操作 (例: 周期のないタスクのスキップ)。メッセージは画面にそのまま出せる文にする。 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}
