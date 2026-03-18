import type { CookieData } from "../profile/manager.js";
import { logger } from "../error/reporter.js";
import {
  parseProductId,
  buildProductUrl,
  type PageRange,
} from "./url-parser.js";
import {
  extractReviews,
  extractReviewSummary,
  type CoupangReview,
} from "./review-extractor.js";
import { spawnWithInput } from "../utils/spawn.js";

export interface ReviewFetchOptions {
  url: string;
  pages: PageRange;
  ratings?: number[];
  sortBy?: string;
  delay?: [number, number]; // [min, max] in seconds
  cookies?: CookieData[];
  timeout?: number;
  onProgress?: (current: number, total: number | null) => void;
}

export interface ReviewFetchResult {
  productId: string;
  productName: string;
  totalReviews: number;
  averageRating: number;
  reviews: CoupangReview[];
  crawledAt: string;
  pagesProcessed: number;
}

export async function fetchCoupangReviews(
  options: ReviewFetchOptions
): Promise<ReviewFetchResult> {
  const productId = parseProductId(options.url);
  const productUrl = buildProductUrl(productId);
  const delay = options.delay ?? [3, 6];
  const sortBy = options.sortBy ?? "ORDER_SCORE_ASC";
  const timeout = options.timeout ?? 30000;
  const startPage = options.pages.start;
  const endPageRequest = options.pages.end;

  logger.info(`상품 ID: ${productId}`);

  const script = buildCdpScript({
    productId,
    productUrl,
    startPage,
    endPageRequest,
    sortBy,
    ratings: options.ratings,
    delay,
    cookies: options.cookies,
    timeout,
  });

  logger.info(`Chrome 브라우저 시작 중... (CDP 연결)`);

  const maxPages = endPageRequest === null ? 300 : (endPageRequest - startPage + 1);
  const totalTimeout = 30000 + maxPages * (delay[1] + 15) * 1000;

  const { stdout } = await spawnWithInput("node", ["--input-type=module"], script, {
    timeout: Math.min(totalTimeout, 600000),
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });

  try {
    const result = JSON.parse(stdout);

    if (result.error) {
      logger.error(result.error);

      if (result.needsLogin) {
        logger.info("");
        logger.info("💡 로그인이 필요합니다:");
        logger.info("   1. webcrawl profile login coupang --url https://www.coupang.com/login");
        logger.info("   2. webcrawl review <URL> --profile coupang");
      }

      return {
        productId,
        productName: "",
        totalReviews: 0,
        averageRating: 0,
        reviews: [],
        crawledAt: new Date().toISOString(),
        pagesProcessed: 0,
      };
    }

    const reviews: CoupangReview[] = [];
    for (const pageHtml of result.reviewPages) {
      const pageReviews = extractReviews(pageHtml, productId);
      reviews.push(...pageReviews);
    }

    const summary = result.summaryHtml
      ? extractReviewSummary(result.summaryHtml)
      : null;

    return {
      productId,
      productName: result.productName ?? "",
      totalReviews: summary?.totalReviews ?? reviews.length,
      averageRating: summary?.averageRating ?? 0,
      reviews,
      crawledAt: new Date().toISOString(),
      pagesProcessed: result.reviewPages.length,
    };
  } catch {
    logger.error("브라우저 출력 파싱 실패");
    if (stdout.length < 500) logger.error(stdout);
    return {
      productId,
      productName: "",
      totalReviews: 0,
      averageRating: 0,
      reviews: [],
      crawledAt: new Date().toISOString(),
      pagesProcessed: 0,
    };
  }
}

interface ScriptParams {
  productId: string;
  productUrl: string;
  startPage: number;
  endPageRequest: number | null;
  sortBy: string;
  ratings?: number[];
  delay: [number, number];
  cookies?: CookieData[];
  timeout: number;
}

function buildCdpScript(params: ScriptParams): string {
  const {
    productId,
    productUrl,
    startPage,
    endPageRequest,
    sortBy,
    ratings,
    delay,
    cookies,
    timeout,
  } = params;

  // Chrome 실행 + CDP 연결 방식 (Akamai 우회)
  return `
import { chromium } from "playwright";
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

const DELAY_MIN = ${delay[0]};
const DELAY_MAX = ${delay[1]};
const CDP_PORT = 9300 + Math.floor(Math.random() * 100);
const USER_DATA_DIR = "/tmp/webcrawl-coupang-" + CDP_PORT;

function sleep(min, max) {
  const ms = (min + Math.random() * (max - min)) * 1000;
  return new Promise(r => setTimeout(r, ms));
}

const output = {
  productName: "",
  summaryHtml: "",
  reviewPages: [],
  error: null,
  needsLogin: false,
};

// Chrome 실행 경로 탐색 (macOS / Windows / Linux)
function findChrome() {
  const platform = process.platform;
  const paths = [];

  if (platform === "darwin") {
    paths.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else if (platform === "win32") {
    const programFiles = process.env.PROGRAMFILES || "C:\\\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";
    paths.push(
      programFiles + "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      programFilesX86 + "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
      localAppData + "\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    );
  } else {
    paths.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    );
  }

  // 환경변수로 Chrome 경로 직접 지정 가능
  const envChrome = process.env.CHROME_PATH;
  if (envChrome && existsSync(envChrome)) return envChrome;

  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

let chromeProcess = null;

try {
  const chromePath = findChrome();
  if (!chromePath) {
    output.error = "Chrome 브라우저를 찾을 수 없습니다. Google Chrome을 설치해주세요.";
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  }

  // Chrome을 remote-debugging 모드로 실행
  chromeProcess = spawn(chromePath, [
    "--remote-debugging-port=" + CDP_PORT,
    "--user-data-dir=" + USER_DATA_DIR,
    "--no-first-run",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  // Chrome이 시작될 때까지 대기
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Chrome 시작 시간 초과")), 15000);
    chromeProcess.stderr.on("data", (data) => {
      if (data.toString().includes("DevTools listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    chromeProcess.on("error", (e) => { clearTimeout(timeout); reject(e); });
    chromeProcess.on("exit", (code) => {
      if (code) { clearTimeout(timeout); reject(new Error("Chrome 종료: " + code)); }
    });
  });

  await sleep(1, 2);

  // Playwright로 CDP 연결
  const browser = await chromium.connectOverCDP("http://localhost:" + CDP_PORT);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  ${cookies?.length ? `
  await context.addCookies(${JSON.stringify(cookies)});
  ` : ""}

  // Step 1: 상품 페이지 방문
  process.stderr.write("상품 페이지 접속 중...\\n");
  await page.goto(${JSON.stringify(productUrl)}, {
    waitUntil: "domcontentloaded",
    timeout: ${timeout},
  });
  await sleep(3, 5);

  const html = await page.content();

  if (html.includes("Access Denied") || html.length < 1000) {
    output.error = "쿠팡 접근이 차단되었습니다. headless=new 모드에서도 차단됨 — headed 모드를 시도합니다.";
    output.needsLogin = true;
    process.stdout.write(JSON.stringify(output));
    await browser.close();
    chromeProcess?.kill();
    process.exit(0);
  }

  // 상품명 추출
  const titleEl = await page.$("h1");
  if (titleEl) {
    output.productName = (await titleEl.textContent())?.trim() ?? "";
  }
  if (!output.productName) {
    const titleMatch = (await page.title()).match(/^(.+?)\\s*[-|]\\s*/);
    output.productName = titleMatch ? titleMatch[1].trim() : "";
  }
  process.stderr.write("상품: " + output.productName + "\\n");

  // Step 2: 브라우저 내 fetch로 리뷰 AJAX 호출
  const fetchReviewPage = async (pageNum) => {
    const params = new URLSearchParams({
      productId: ${JSON.stringify(productId)},
      page: String(pageNum),
      size: "5",
      sortBy: ${JSON.stringify(sortBy)},
      viRoleCode: "3",
      ratingSummary: "true",
    });
    ${ratings?.length ? `params.set("ratings", ${JSON.stringify(ratings.join(","))});` : ""}

    return await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            "Accept": "text/html, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
        });
        if (!res.ok) return { error: res.status, html: "" };
        return { error: null, html: await res.text() };
      } catch (e) {
        return { error: String(e), html: "" };
      }
    }, "https://www.coupang.com/vp/product/reviews?" + params.toString());
  };

  // Step 3: 첫 페이지 수집
  await sleep(DELAY_MIN, DELAY_MAX);
  process.stderr.write("리뷰 수집 시작...\\n");

  const firstPage = await fetchReviewPage(1);

  if (firstPage.error || !firstPage.html || firstPage.html.length < 50) {
    output.error = "리뷰를 가져올 수 없습니다. " + (firstPage.error ? "HTTP " + firstPage.error : "빈 응답");
    output.needsLogin = ${!cookies?.length};
    process.stdout.write(JSON.stringify(output));
    await browser.close();
    chromeProcess?.kill();
    process.exit(0);
  }

  output.summaryHtml = firstPage.html;

  // 총 리뷰 수 파악
  const countMatch = firstPage.html.match(/data-count="(\\d+)"/);
  let totalReviews = countMatch ? parseInt(countMatch[1], 10) : 0;

  const totalPages = Math.min(Math.ceil(totalReviews / 5) || 1, 300);
  const startP = ${startPage};
  const endP = ${endPageRequest === null ? "totalPages" : `Math.min(${endPageRequest}, totalPages)`};

  process.stderr.write("총 리뷰: " + totalReviews + "개 (" + totalPages + "페이지), 수집: " + startP + "~" + endP + "\\n");

  // 첫 페이지 저장
  if (startP === 1) {
    output.reviewPages.push(firstPage.html);
  }

  // Step 4: 나머지 페이지 순차 수집
  const fetchFrom = startP === 1 ? 2 : startP;
  for (let p = fetchFrom; p <= endP; p++) {
    await sleep(DELAY_MIN, DELAY_MAX);

    const result = await fetchReviewPage(p);
    if (result.error || !result.html || result.html.length < 50) {
      process.stderr.write(p + "페이지 실패, 수집 종료\\n");
      break;
    }

    output.reviewPages.push(result.html);
    process.stderr.write("[" + p + "/" + endP + "] ");
  }

  process.stderr.write("\\n");
  process.stdout.write(JSON.stringify(output));
  await browser.close();
  chromeProcess?.kill();
} catch (err) {
  output.error = String(err);
  process.stdout.write(JSON.stringify(output));
  chromeProcess?.kill();
  process.exit(0);
}
`;
}
