import type { JobConfig } from "./config-loader.js";
import { decideFetchStrategy, type FetchStrategy } from "../fetcher/strategy.js";
import { fetchWithPlaywright, takeScreenshot } from "../fetcher/playwright.js";
import { fetchWithScrapling, checkScraplingInstalled } from "../fetcher/scrapling.js";
import { extractData } from "../extractor/index.js";
import { writeOutput } from "../output/index.js";
import { ProfileManager } from "../profile/manager.js";
import { ErrorReporter, logger } from "../error/reporter.js";

export interface JobResult {
  data: Record<string, unknown>[];
  url: string;
  strategy: string;
  errors: number;
  outputPath?: string;
}

let scraplingAvailable: boolean | null = null;

async function isScraplingAvailable(): Promise<boolean> {
  if (scraplingAvailable === null) {
    scraplingAvailable = await checkScraplingInstalled();
    if (!scraplingAvailable) {
      logger.warn("Scrapling not installed. Falling back to Playwright for all fetches.");
      logger.warn("Install with: pip install scrapling");
    }
  }
  return scraplingAvailable;
}

async function resolveStrategy(config: JobConfig): Promise<FetchStrategy> {
  const strategy = decideFetchStrategy(config);

  if (strategy !== "playwright" && !(await isScraplingAvailable())) {
    logger.info("Scrapling unavailable, falling back to playwright");
    return "playwright";
  }

  return strategy;
}

export async function executeJob(config: JobConfig): Promise<JobResult> {
  const reporter = new ErrorReporter();
  const profileManager = new ProfileManager();
  const urls = Array.isArray(config.url) ? config.url : [config.url];
  const allData: Record<string, unknown>[] = [];
  let lastStrategy = "";

  const profile = config.profile
    ? await profileManager.load(config.profile)
    : null;

  if (config.profile && !profile) {
    logger.warn(`Profile "${config.profile}" not found, proceeding without it`);
  }

  for (const url of urls) {
    let html: string | null = null;
    let attempts = 0;
    const maxRetries = config.retry;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const strategy = await resolveStrategy(config);
        lastStrategy = strategy;

        if (strategy === "playwright") {
          const result = await fetchWithPlaywright(url, {
            steps: config.steps,
            cookies: profile?.cookies,
            timeout: config.timeout,
          });
          html = result.html;
        } else {
          const result = await fetchWithScrapling({
            url,
            fields: config.fields,
            adaptive: config.adaptive,
            stealth: strategy === "scrapling-stealth" ? config.stealth : "off",
            timeout: config.timeout,
          });

          if (result.data.length > 0) {
            allData.push(...result.data);
            html = result.html ?? null;
            break;
          }

          html = result.html ?? null;
        }

        break;
      } catch (err) {
        reporter.record(url, err as Error, attempts);

        if (attempts >= maxRetries) {
          logger.error(`All ${maxRetries} attempts failed for: ${url}`);

          if (config.screenshot_on_error) {
            try {
              const screenshot = await takeScreenshot(url, profile?.cookies);
              await reporter.saveScreenshot(screenshot, config.name, url);
            } catch {
              logger.warn("Failed to take error screenshot");
            }
          }
        }
      }
    }

    if (html && allData.length === 0) {
      try {
        const extracted = await extractData(html, config);
        allData.push(...extracted);
      } catch (err) {
        reporter.record(url, err as Error, 0);
      }
    }
  }

  if (allData.length > 0) {
    await writeOutput(allData, config.output);
  }

  if (reporter.errorCount > 0) {
    await reporter.saveReport(config.name);
  }

  return {
    data: allData,
    url: urls.join(", "),
    strategy: lastStrategy,
    errors: reporter.errorCount,
    outputPath: config.output.path,
  };
}
