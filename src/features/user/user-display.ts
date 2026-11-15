/** ヘッダーのアバターとメニューに出す、ログイン中の人の情報 */
export type CurrentUser =
  /** Cloudflare Access を通ってきた本番。email は Access の JWT から取る */
  | { kind: "access"; email: string | null }
  /** vp dev (Access を通らないローカル開発) */
  | { kind: "local" };

const LOCAL_SEED = "local-dev@manuaroom";

/**
 * アバターの模様を決める文字列。同じ人なら端末が変わっても同じ顔になるよう、メールアドレスを正規化して使う。
 */
export function avatarSeed(user: CurrentUser): string {
  if (user.kind === "local") return LOCAL_SEED;
  return user.email?.trim().toLowerCase() || "unknown@manuaroom";
}

/**
 * メニューの見出しに出す名前。Access から取れた名前 (Google アカウントの表示名) を優先し、
 * なければメールアドレスの @ より前を使う。
 */
export function userDisplayName(user: CurrentUser, identityName?: string | null): string {
  if (user.kind === "local") return "ローカル開発ユーザー";
  const name = identityName?.trim();
  if (name) return name;
  const localPart = user.email?.split("@")[0]?.trim();
  return localPart || "ログイン中のユーザー";
}
