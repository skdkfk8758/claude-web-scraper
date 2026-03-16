import { Command } from "commander";
import { parseInlineConfig } from "../core/config-loader.js";
import { decideFetchStrategy } from "../fetcher/strategy.js";
import { fetchWithPlaywright } from "../fetcher/playwright.js";
import { fetchWithScrapling, checkScraplingInstalled } from "../fetcher/scrapling.js";
import { ProfileManager } from "../profile/manager.js";
import { cleanHtml } from "../extractor/ai-extractor.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../error/reporter.js";

export const htmlCommand = new Command("html")
  .description("Fetch a page and output cleaned HTML (for AI analysis)")
  .argument("<url>", "Target URL")
  .option("--stealth <mode>", "Stealth mode (auto|off|cloudflare)", "auto")
  .option("--profile <name>", "Use saved profile")
  .option("--raw", "Output raw HTML without cleaning", false)
  .option("-o, --output <path>", "Save to file instead of stdout")
  .option("--max-length <n>", "Max HTML length", "100000")
  .action(async (url: string, options) => {
    try {
      const profileManager = new ProfileManager();
      const profile = options.profile
        ? await profileManager.load(options.profile)
        : null;

      let html: string;

      // Decide fetch strategy
      const scraplingAvailable = await checkScraplingInstalled();
      const usePlaywright = !scraplingAvailable || options.stealth === "cloudflare";

      if (usePlaywright) {
        const result = await fetchWithPlaywright(url, {
          cookies: profile?.cookies,
          timeout: 30000,
        });
        html = result.html;
      } else {
        const result = await fetchWithScrapling({
          url,
          stealth: options.stealth,
          timeout: 30000,
        });
        html = result.html ?? "";
      }

      // Clean if not raw
      if (!options.raw) {
        html = cleanHtml(html, parseInt(options.maxLength, 10));
      }

      // Output
      if (options.output) {
        const dir = join(process.cwd(), "data", ".ai-extract");
        await mkdir(dir, { recursive: true });
        await writeFile(options.output, html, "utf-8");
        logger.info(`HTML saved: ${options.output} (${html.length} chars)`);
      } else {
        process.stdout.write(html);
      }
    } catch (err) {
      logger.error(`HTML fetch failed: ${err}`);
      process.exit(1);
    }
  });
