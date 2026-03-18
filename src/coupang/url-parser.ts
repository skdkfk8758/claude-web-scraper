const PRODUCT_URL_PATTERNS = [
  // Desktop: /vp/products/{id} or /vp/products/{id}?...
  /coupang\.com\/vp\/products\/(\d+)/,
  // Mobile: /vm/products/{id}
  /m\.coupang\.com\/vm\/products\/(\d+)/,
  // Alternative patterns
  /coupang\.com\/vp\/products\/(\d+)/,
];

const REVIEW_API_BASE = "https://www.coupang.com/vp/product/reviews";

export interface CoupangReviewApiParams {
  productId: string;
  page: number;
  size: number;
  sortBy: string;
  ratings?: number[];
}

export function parseProductId(url: string): string {
  for (const pattern of PRODUCT_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Try extracting from review URL: /vp/product/reviews?productId=XXX
  const reviewMatch = url.match(/[?&]productId=(\d+)/);
  if (reviewMatch?.[1]) {
    return reviewMatch[1];
  }

  // If the input is just a numeric ID
  if (/^\d+$/.test(url.trim())) {
    return url.trim();
  }

  throw new Error(
    `쿠팡 상품 URL에서 productId를 추출할 수 없습니다.\n` +
    `지원 형식:\n` +
    `  - https://www.coupang.com/vp/products/1234567\n` +
    `  - https://m.coupang.com/vm/products/1234567\n` +
    `  - https://www.coupang.com/vp/product/reviews?productId=1234567`
  );
}

export function buildProductUrl(productId: string): string {
  return `https://www.coupang.com/vp/products/${productId}`;
}

export function buildReviewApiUrl(params: CoupangReviewApiParams): string {
  const query = new URLSearchParams({
    productId: params.productId,
    page: String(params.page),
    size: String(params.size),
    sortBy: params.sortBy,
    viRoleCode: "3",
    ratingSummary: "true",
  });

  if (params.ratings?.length) {
    query.set("ratings", params.ratings.join(","));
  }

  return `${REVIEW_API_BASE}?${query.toString()}`;
}

export interface PageRange {
  start: number;
  end: number | null; // null means "all"
}

export function parsePageRange(input: string): PageRange {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "all") {
    return { start: 1, end: null };
  }

  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return {
      start: parseInt(rangeMatch[1], 10),
      end: parseInt(rangeMatch[2], 10),
    };
  }

  const singlePage = parseInt(trimmed, 10);
  if (!isNaN(singlePage) && singlePage > 0) {
    return { start: singlePage, end: singlePage };
  }

  throw new Error(
    `잘못된 페이지 범위: "${input}"\n` +
    `사용법: --pages 1-5, --pages all, --pages 3`
  );
}
