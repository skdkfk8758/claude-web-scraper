import { writeJson } from "./json-writer.js";
import { writeCsv } from "./csv-writer.js";
import type { OutputConfig } from "../core/config-loader.js";

export async function writeOutput(
  data: Record<string, unknown>[],
  config: OutputConfig
): Promise<void> {
  if (config.format === "csv") {
    await writeCsv(data, config.path);
  } else {
    await writeJson(data, config.path);
  }
}

export { writeJson, writeCsv };
