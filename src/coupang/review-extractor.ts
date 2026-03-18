import { load } from "cheerio";

export interface CoupangReview {
  productId: string;
  reviewId: string;
  username: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  purchaseOption: string;
  helpfulCount: number;
  images: string[];
  isMembershipReview: boolean;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export function extractReviews(html: string, productId: string): CoupangReview[] {
  const $ = load(html);
  const reviews: CoupangReview[] = [];

  $("article.sdp-review__article__list").each((_, el) => {
    const $el = $(el);

    const reviewId = $el.attr("id") ?? $el.data("review-id")?.toString() ?? "";

    const ratingEl = $el.find(".sdp-review__article__list__info__product-info__star-orange");
    const dataRating = ratingEl.attr("data-rating") ?? ratingEl.data("rating")?.toString();
    let rating = dataRating ? parseInt(dataRating, 10) : 0;
    if (!rating) {
      const ratingWidth = ratingEl.attr("style") ?? "";
      const widthMatch = ratingWidth.match(/width:\s*([\d.]+)%/);
      rating = widthMatch ? Math.round(parseFloat(widthMatch[1]) / 20) : 0;
    }

    const username = $el
      .find(".sdp-review__article__list__info__user__name")
      .text()
      .trim();

    const title = $el
      .find(".sdp-review__article__list__headline")
      .text()
      .trim();

    const content = $el
      .find(".sdp-review__article__list__review__content")
      .text()
      .trim()
      || $el.find(".sdp-review__article__list__review").text().trim();

    const dateText = $el
      .find(".sdp-review__article__list__info__product-info__reg-date")
      .text()
      .trim();
    const date = parseCoupangDate(dateText);

    const purchaseOption = $el
      .find(".sdp-review__article__list__info__product-info__name")
      .text()
      .trim();

    const helpfulText = $el
      .find(".sdp-review__article__list__help__count")
      .text()
      .trim();
    const helpfulMatch = helpfulText.match(/(\d+)/);
    const helpfulCount = helpfulMatch ? parseInt(helpfulMatch[1], 10) : 0;

    const images: string[] = [];
    $el.find(".sdp-review__article__list__attachment__list img").each((_, img) => {
      const src = $(img).attr("src") ?? $(img).data("src")?.toString();
      if (src) {
        images.push(src.startsWith("//") ? `https:${src}` : src);
      }
    });

    const isMembershipReview = $el.find(".sdp-review__article__list__info__user__membership").length > 0
      || $el.find("[class*='rocket']").length > 0;

    reviews.push({
      productId,
      reviewId,
      username,
      rating,
      title,
      content,
      date,
      purchaseOption,
      helpfulCount,
      images,
      isMembershipReview,
    });
  });

  return reviews;
}

export function extractReviewSummary(html: string): ReviewSummary | null {
  const $ = load(html);

  const totalText = $(".sdp-review__article__order__total__count").text().trim()
    || $(".count").text().trim();
  const totalMatch = totalText.match(/([\d,]+)/);
  const totalReviews = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : 0;

  const avgText = $(".sdp-review__article__order__star__avg").text().trim();
  const averageRating = avgText ? parseFloat(avgText) : 0;

  const ratingDistribution: Record<number, number> = {};
  $(".sdp-review__article__order__star__graph__item").each((_, el) => {
    const label = $(el).find(".sdp-review__article__order__star__graph__label").text().trim();
    const count = $(el).find(".sdp-review__article__order__star__graph__count").text().trim();
    const starMatch = label.match(/(\d)/);
    const countMatch = count.match(/([\d,]+)/);
    if (starMatch && countMatch) {
      ratingDistribution[parseInt(starMatch[1], 10)] = parseInt(countMatch[1].replace(/,/g, ""), 10);
    }
  });

  if (totalReviews === 0 && averageRating === 0) {
    return null;
  }

  return { totalReviews, averageRating, ratingDistribution };
}

function parseCoupangDate(text: string): string {
  // "2024.01.15" → "2024-01-15"
  const dotMatch = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[3].padStart(2, "0")}`;
  }
  return text || "";
}
