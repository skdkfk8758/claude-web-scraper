import { extractBySelectors } from "./selector.js";
import { extractWithAI } from "./ai-extractor.js";
import type { JobConfig } from "../core/config-loader.js";

export async function extractData(
  html: string,
  config: JobConfig
): Promise<Record<string, unknown>[]> {
  if (config.fields && Object.keys(config.fields).length > 0) {
    return extractBySelectors(html, config.fields);
  }

  if (config.extract) {
    return extractWithAI(html, config.extract);
  }

  throw new Error("No extraction method specified. Use --fields or --extract");
}

export { extractBySelectors, extractWithAI };
