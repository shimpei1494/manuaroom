import { BusinessRuleError } from "../errors";

/**
 * 製品に関連する Web ページへのリンク (公式ページ、サポート FAQ、交換部品の購入ページなど)。
 * 人が別タブで開いて見るためのもので、AI には渡さない。
 */
export type ProductLink = {
  id: string;
  userId: string;
  productId: string;
  url: string;
  /** 何のページか (例: 公式サポート FAQ)。未入力ならホスト名を入れる */
  title: string;
  /** 何が書いてあるか。リンクが切れても何を探せばよいか分かるように残す */
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductLinkFields = {
  url: string;
  title: string;
  description: string | null;
};

export const PRODUCT_LINK_LIMITS = { url: 2048, title: 100, description: 500 } as const;

/**
 * 入力されたリンクを保存する形に整える。http / https 以外の URL (javascript: など) は受け付けない。
 * タイトルが空ならホスト名で埋める。
 */
export function normalizeProductLinkFields(input: {
  url: string;
  title?: string | null;
  description?: string | null;
}): ProductLinkFields {
  const url = input.url.trim();
  if (url.length > PRODUCT_LINK_LIMITS.url) {
    throw new BusinessRuleError(`URL は ${PRODUCT_LINK_LIMITS.url} 文字以内にしてください`);
  }
  const parsed = parseHttpUrl(url);
  if (!parsed) {
    throw new BusinessRuleError("http:// か https:// で始まる URL を入力してください");
  }
  const title = clean(input.title) ?? hostnameOf(parsed);
  if (title.length > PRODUCT_LINK_LIMITS.title) {
    throw new BusinessRuleError(`タイトルは ${PRODUCT_LINK_LIMITS.title} 文字以内にしてください`);
  }
  const description = clean(input.description);
  if (description !== null && description.length > PRODUCT_LINK_LIMITS.description) {
    throw new BusinessRuleError(`説明は ${PRODUCT_LINK_LIMITS.description} 文字以内にしてください`);
  }
  return { url, title, description };
}

/** 画面に小さく出すホスト名 (先頭の www. は省く)。URL として読めなければ null。 */
export function productLinkHostname(url: string): string | null {
  const parsed = parseHttpUrl(url);
  return parsed ? hostnameOf(parsed) : null;
}

function parseHttpUrl(value: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.hostname.length === 0) return null;
  return parsed;
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}
