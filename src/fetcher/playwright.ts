import type { Step } from "../core/config-loader.js";
import type { CookieData } from "../profile/manager.js";
import { spawnWithInput } from "../utils/spawn.js";
import { logger } from "../error/reporter.js";

interface PlaywrightResult {
  html: string;
  url: string;
  screenshot?: Buffer;
}

export async function fetchWithPlaywright(
  url: string,
  options: {
    steps?: Step[];
    cookies?: CookieData[];
    timeout?: number;
    screenshotOnError?: boolean;
    headless?: boolean;
  } = {}
): Promise<PlaywrightResult> {
  const script = buildPlaywrightScript(url, options);
  const { stdout } = await spawnWithInput("node", ["--input-type=module"], script, {
    timeout: (options.timeout ?? 60000) + 10000,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });

  const result = JSON.parse(stdout);
  return {
    html: result.html,
    url: result.url,
    screenshot: result.screenshot ? Buffer.from(result.screenshot, "base64") : undefined,
  };
}

function buildPlaywrightScript(
  url: string,
  options: {
    steps?: Step[];
    cookies?: CookieData[];
    timeout?: number;
    headless?: boolean;
  }
): string {
  const stepsCode = (options.steps ?? [])
    .map((step) => {
      switch (step.action) {
        case "click":
          return `  await page.click(${JSON.stringify(step.selector)});`;
        case "wait":
          if (step.selector) {
            return `  await page.waitForSelector(${JSON.stringify(step.selector)}, { timeout: ${step.timeout ?? 10000} });`;
          }
          return `  await page.waitForTimeout(${step.timeout ?? 2000});`;
        case "scroll":
          if (step.direction === "infinite") {
            return `  await autoScroll(page);`;
          }
          return `  await page.evaluate(() => window.scrollBy(0, ${step.direction === "up" ? -(step.amount ?? 500) : step.amount ?? 500}));`;
        case "type":
          return `  await page.fill(${JSON.stringify(step.selector)}, ${JSON.stringify(step.text)});`;
        case "select":
          return `  await page.selectOption(${JSON.stringify(step.selector)}, ${JSON.stringify(step.value)});`;
        case "screenshot":
          return `  await page.screenshot({ path: ${JSON.stringify(step.path ?? "screenshot.png")} });`;
        default:
          return "";
      }
    })
    .join("\n");

  const needsAutoScroll = options.steps?.some(
    (s) => s.action === "scroll" && s.direction === "infinite"
  );

  return `
import { chromium } from "playwright";

${
  needsAutoScroll
    ? `
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
      setTimeout(() => { clearInterval(timer); resolve(); }, 30000);
    });
  });
}
`
    : ""
}

const browser = await chromium.launch({ headless: ${options.headless !== false} });
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

${
  options.cookies?.length
    ? `await context.addCookies(${JSON.stringify(options.cookies)});`
    : ""
}

const page = await context.newPage();
await page.goto(${JSON.stringify(url)}, { waitUntil: "networkidle", timeout: ${options.timeout ?? 30000} });

${stepsCode}

const html = await page.content();
const finalUrl = page.url();

const result = JSON.stringify({ html, url: finalUrl });
process.stdout.write(result);

await browser.close();
`;
}

export async function takeScreenshot(
  url: string,
  cookies?: CookieData[]
): Promise<Buffer> {
  const script = `
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
${cookies?.length ? `await context.addCookies(${JSON.stringify(cookies)});` : ""}
const page = await context.newPage();
await page.goto(${JSON.stringify(url)}, { waitUntil: "networkidle", timeout: 30000 });
const screenshot = await page.screenshot({ fullPage: true });
process.stdout.write(screenshot.toString("base64"));
await browser.close();
`;

  const { stdout } = await spawnWithInput("node", ["--input-type=module"], script, {
    timeout: 60000,
  });

  return Buffer.from(stdout, "base64");
}
