import { Command } from "commander";
import { fetchCoupangReviews } from "../coupang/review-fetcher.js";
import { parsePageRange } from "../coupang/url-parser.js";
import { ProfileManager } from "../profile/manager.js";
import { writeJson } from "../output/json-writer.js";
import { writeCsv } from "../output/csv-writer.js";
import { logger } from "../error/reporter.js";

export const reviewCommand = new Command("review")
  .description("쿠팡 상품 리뷰를 수집합니다")
  .argument("<url>", "쿠팡 상품 URL 또는 product ID")
  .option("--pages <range>", "페이지 범위 (예: 1-5, all)", "1")
  .option("--rating <stars>", "별점 필터 (예: 1,2,5)")
  .option("--sort <order>", "정렬 (latest|rating|helpful)", "latest")
  .option("--delay <range>", "요청 딜레이 초 (예: 3-6)", "3-6")
  .option("--format <type>", "출력 형식 (json|csv)", "json")
  .option("-o, --output <path>", "출력 파일 경로")
  .option("--profile <name>", "로그인 프로필 사용")
  .option("--timeout <ms>", "페이지 타임아웃 (ms)", "30000")
  .action(async (url: string, options) => {
    try {
      const profileManager = new ProfileManager();
      const profile = options.profile
        ? await profileManager.load(options.profile)
        : null;

      if (options.profile && !profile) {
        logger.warn(`프로필 "${options.profile}" 을 찾을 수 없습니다`);
      }

      const pages = parsePageRange(options.pages);

      const delayMatch = options.delay.match(/^(\d+)-(\d+)$/);
      const delay: [number, number] = delayMatch
        ? [parseInt(delayMatch[1], 10), parseInt(delayMatch[2], 10)]
        : [3, 6];

      const ratings = options.rating
        ? options.rating.split(",").map((s: string) => parseInt(s.trim(), 10))
        : undefined;

      const sortByMap: Record<string, string> = {
        latest: "ORDER_SCORE_ASC",
        rating: "RATING_DESC",
        helpful: "HELPFUL_DESC",
      };
      const sortBy = sortByMap[options.sort] ?? "ORDER_SCORE_ASC";

      logger.info("🔍 쿠팡 리뷰 수집을 시작합니다...");
      logger.info("");

      const result = await fetchCoupangReviews({
        url,
        pages,
        ratings,
        sortBy,
        delay,
        cookies: profile?.cookies,
        timeout: parseInt(options.timeout, 10),
      });

      if (result.reviews.length === 0) {
        logger.info("수집된 리뷰가 없습니다.");
        return;
      }

      // 출력 경로 결정
      const defaultPath = `data/coupang-reviews-${result.productId}.${options.format}`;
      const outputPath = options.output ?? defaultPath;

      const outputData = result.reviews.map((r) => ({
        ...r,
        images: r.images.join(" | "),
      }));

      if (options.format === "csv") {
        await writeCsv(outputData, outputPath);
      } else {
        await writeJson(result, outputPath);
      }

      logger.info("");
      logger.info(`✅ 수집 완료`);
      logger.info(`   상품: ${result.productName || result.productId}`);
      logger.info(`   리뷰: ${result.reviews.length}개 / 전체 ${result.totalReviews}개`);
      logger.info(`   평점: ${result.averageRating}`);
      logger.info(`   페이지: ${result.pagesProcessed}개 처리`);
      logger.info(`   저장: ${outputPath}`);
    } catch (err) {
      logger.error(`리뷰 수집 실패: ${err}`);
      process.exit(1);
    }
  });
