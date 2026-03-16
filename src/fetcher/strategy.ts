import type { JobConfig, Step } from "../core/config-loader.js";
import { logger } from "../error/reporter.js";

export type FetchStrategy = "playwright" | "scrapling-http" | "scrapling-stealth";

export function decideFetchStrategy(config: JobConfig): FetchStrategy {
  if (config.steps && config.steps.length > 0) {
    logger.info("Strategy: playwright (interactive steps detected)");
    return "playwright";
  }

  if (config.stealth === "cloudflare") {
    logger.info("Strategy: scrapling-stealth (cloudflare mode)");
    return "scrapling-stealth";
  }

  if (config.stealth === "off") {
    logger.info("Strategy: scrapling-http (stealth disabled)");
    return "scrapling-http";
  }

  // auto mode: use stealth by default for safety
  if (config.adaptive) {
    logger.info("Strategy: scrapling-stealth (adaptive + auto stealth)");
    return "scrapling-stealth";
  }

  logger.info("Strategy: scrapling-http (default)");
  return "scrapling-http";
}
