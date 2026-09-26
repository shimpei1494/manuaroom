/** 指定された ID のエンティティが (そのユーザーの範囲で) 見つからない。 */
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}
