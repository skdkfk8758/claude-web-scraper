import { Command } from "commander";
import { loadConfig } from "../core/config-loader.js";
import { executeJob } from "../core/orchestrator.js";
import { logger } from "../error/reporter.js";

export const runCommand = new Command("run")
  .description("Run a scraping job from a YAML config file")
  .argument("<config>", "Path to YAML config file")
  .action(async (configPath: string) => {
    try {
      const config = await loadConfig(configPath);
      logger.info(`Running job: ${config.name}`);

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
      logger.error(`Run failed: ${err}`);
      process.exit(1);
    }
  });
