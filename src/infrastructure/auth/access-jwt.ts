import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

import type { AccessConfig } from "./access-config";

/** Access が Worker へのリクエストに付ける JWT のヘッダー */
export const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";

export type AccessVerification = { ok: true; email: string | null } | { ok: false };

// 公開鍵はチームごとに取得し、jose のキャッシュを Worker の生存中は使い回す
const remoteJwksByTeam = new Map<string, JWTVerifyGetKey>();

function remoteJwks(teamDomain: string): JWTVerifyGetKey {
  let jwks = remoteJwksByTeam.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    remoteJwksByTeam.set(teamDomain, jwks);
  }
  return jwks;
}

/**
 * Cloudflare Access を通ってきたリクエストかを、JWT の署名・発行元・AUD・期限で確かめる (ADR 0005)。
 * `options` はテスト用 (公開鍵と現在時刻の差し替え)。
 */
export async function verifyAccessRequest(
  request: Request,
  config: Pick<AccessConfig, "teamDomain" | "aud">,
  options: { jwks?: JWTVerifyGetKey; now?: Date } = {},
): Promise<AccessVerification> {
  const token = request.headers.get(ACCESS_JWT_HEADER);
  if (!token) return { ok: false };
  try {
    const { payload } = await jwtVerify(token, options.jwks ?? remoteJwks(config.teamDomain), {
      issuer: `https://${config.teamDomain}`,
      audience: config.aud,
      currentDate: options.now,
    });
    return { ok: true, email: typeof payload.email === "string" ? payload.email : null };
  } catch {
    return { ok: false };
  }
}
