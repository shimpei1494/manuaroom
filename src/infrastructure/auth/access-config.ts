export type AccessConfig = {
  /** Zero Trust のチームドメイン (例: `family.cloudflareaccess.com`) */
  teamDomain: string;
  /** Access アプリケーションの AUD タグ */
  aud: string;
  /** Access を通過した家族全員で共有するユーザー ID (ADR 0005「データの所有者」) */
  appUserId: string;
};

type AccessEnv = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  APP_USER_ID?: string;
};

/**
 * wrangler.jsonc の vars から Access の設定を読む。
 * 足りない項目があれば例外にして、検証なしで動くことがないようにする。
 */
export function readAccessConfig(env: AccessEnv): AccessConfig {
  const teamDomain = (env.ACCESS_TEAM_DOMAIN ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const aud = (env.ACCESS_AUD ?? "").trim();
  const appUserId = (env.APP_USER_ID ?? "").trim();

  const missing = [
    teamDomain ? null : "ACCESS_TEAM_DOMAIN",
    aud ? null : "ACCESS_AUD",
    appUserId ? null : "APP_USER_ID",
  ].filter((name) => name !== null);
  if (missing.length > 0) {
    throw new Error(`Cloudflare Access の設定が足りません: ${missing.join(", ")}`);
  }
  return { teamDomain, aud, appUserId };
}
