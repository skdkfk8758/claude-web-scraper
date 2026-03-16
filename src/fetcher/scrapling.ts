import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { spawnWithInput } from "../utils/spawn.js";
import { logger } from "../error/reporter.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_SCRIPT = join(__dirname, "..", "bridge", "scrapling_bridge.py");

export interface ScraplingOptions {
  url: string;
  fields?: Record<string, string>;
  adaptive?: boolean;
  stealth?: "auto" | "off" | "cloudflare";
  timeout?: number;
  html?: string;
}

export interface ScraplingResult {
  html?: string;
  data: Record<string, unknown>[];
  url: string;
  fetcherUsed: string;
}

export async function fetchWithScrapling(options: ScraplingOptions): Promise<ScraplingResult> {
  const input = JSON.stringify({
    url: options.url,
    fields: options.fields,
    adaptive: options.adaptive ?? false,
    stealth: options.stealth ?? "auto",
    html: options.html,
  });

  logger.debug(`Scrapling bridge call: ${options.url}`);

  try {
    const { stdout, stderr } = await spawnWithInput("python3", [BRIDGE_SCRIPT], input, {
      timeout: options.timeout ?? 60000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    if (stderr) logger.debug(`Scrapling stderr: ${stderr}`);

    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(`Scrapling error: ${result.error}`);
    }

    return result as ScraplingResult;
  } catch (err) {
    logger.error(`Scrapling bridge failed: ${err}`);
    throw err;
  }
}

export async function checkScraplingInstalled(): Promise<boolean> {
  try {
    await execFileAsync("python3", ["-c", "import scrapling; print('ok')"]);
    return true;
  } catch {
    return false;
  }
}
