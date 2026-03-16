import { Command } from "commander";
import { parseInlineConfig } from "../core/config-loader.js";
import { executeJob } from "../core/orchestrator.js";
import { logger } from "../error/reporter.js";

export const fetchCommand = new Command("fetch")
  .description("Fetch and extract data from a URL")
  .argument("<url>", "Target URL to scrape")
  .option("-f, --fields <fields...>", "Field definitions (key:selector format)")
  .option("-e, --extract <prompt>", "AI extraction prompt")
  .option("-o, --output <path>", "Output file path")
  .option("--format <format>", "Output format (json|csv)", "json")
  .option("--stealth <mode>", "Stealth mode (auto|off|cloudflare)", "auto")
  .option("--adaptive", "Enable adaptive selector matching", false)
  .option("--retry <n>", "Number of retries", "3")
  .option("--profile <name>", "Use saved profile for cookies/session")
  .action(async (url: string, options) => {
    try {
      const config = parseInlineConfig({
        url,
        fields: options.fields,
        extract: options.extract,
        output: options.output,
        format: options.format,
        stealth: options.stealth,
        adaptive: options.adaptive,
        retry: parseInt(options.retry, 10),
        profile: options.profile,
      });

      const result = await executeJob(config);

      if (result.errors > 0) {
        logger.warn(`Completed with ${result.errors} error(s)`);
      }

      if (result.outputPath) {
        logger.info(`Output saved to: ${result.outputPath}`);
      }

      logger.info(
        `Done: ${result.data.length} records extracted (strategy: ${result.strategy})`
      );
    } catch (err) {
      logger.error(`Fetch failed: ${err}`);
      process.exit(1);
    }
  });
