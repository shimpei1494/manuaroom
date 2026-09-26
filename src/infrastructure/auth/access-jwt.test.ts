import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { ACCESS_JWT_HEADER, verifyAccessRequest } from "./access-jwt";

// Cloudflare Access が付ける JWT の検証 (ADR 0005)。
// 本物の公開鍵の代わりに、テスト内で作った鍵ペアの JWKS を渡す。

const TEAM_DOMAIN = "family.cloudflareaccess.com";
const AUD = "test-aud-tag";
const NOW = new Date("2026-09-26T00:00:00Z");

let privateKey: CryptoKey;
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256" };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

async function sign(overrides: { issuer?: string; audience?: string; expiresAt?: Date } = {}) {
  return new SignJWT({ email: "family@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(overrides.issuer ?? `https://${TEAM_DOMAIN}`)
    .setAudience(overrides.audience ?? AUD)
    .setIssuedAt(Math.floor(NOW.getTime() / 1000) - 60)
    .setExpirationTime(overrides.expiresAt ?? new Date(NOW.getTime() + 60 * 60 * 1000))
    .sign(privateKey);
}

function requestWith(token: string | null): Request {
  const headers = new Headers();
  if (token !== null) headers.set(ACCESS_JWT_HEADER, token);
  return new Request("https://manuaroom.example.workers.dev/", { headers });
}

function verify(request: Request) {
  return verifyAccessRequest(request, { teamDomain: TEAM_DOMAIN, aud: AUD }, { jwks, now: NOW });
}

describe("verifyAccessRequest", () => {
  test("チームと AUD が一致する有効な JWT なら通す", async () => {
    expect(await verify(requestWith(await sign()))).toEqual({
      ok: true,
      email: "family@example.com",
    });
  });

  test("ヘッダーがない（Access を通っていない）リクエストは拒否する", async () => {
    expect(await verify(requestWith(null))).toEqual({ ok: false });
  });

  test("別のアプリ（AUD が違う）の JWT は拒否する", async () => {
    expect(await verify(requestWith(await sign({ audience: "other-app" })))).toEqual({
      ok: false,
    });
  });

  test("別のチームが発行した JWT は拒否する", async () => {
    const token = await sign({ issuer: "https://someone-else.cloudflareaccess.com" });
    expect(await verify(requestWith(token))).toEqual({ ok: false });
  });

  test("期限切れの JWT は拒否する", async () => {
    const token = await sign({ expiresAt: new Date(NOW.getTime() - 1000) });
    expect(await verify(requestWith(token))).toEqual({ ok: false });
  });

  test("署名が壊れた JWT は拒否する", async () => {
    const token = await sign();
    expect(await verify(requestWith(`${token.slice(0, -4)}AAAA`))).toEqual({ ok: false });
  });
});
