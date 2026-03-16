import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import pino from "pino";

const LOG_DIR = join(process.cwd(), "logs");

export interface ErrorRecord {
  url: string;
  error: string;
  attempt: number;
  timestamp: string;
  screenshotPath?: string;
}

export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard" },
  },
});

export class ErrorReporter {
  private errors: ErrorRecord[] = [];

  record(url: string, error: Error | string, attempt: number): void {
    const record: ErrorRecord = {
      url,
      error: error instanceof Error ? error.message : error,
      attempt,
      timestamp: new Date().toISOString(),
    };
    this.errors.push(record);
    logger.error({ url, attempt }, `Fetch failed: ${record.error}`);
  }

  async saveScreenshot(
    screenshotBuffer: Buffer,
    jobName: string,
    url: string
  ): Promise<string> {
    const dir = join(LOG_DIR, "screenshots");
    await mkdir(dir, { recursive: true });
    const sanitized = url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 80);
    const filename = `${jobName}_${sanitized}_${Date.now()}.png`;
    const filePath = join(dir, filename);
    await writeFile(filePath, screenshotBuffer);
    logger.info(`Screenshot saved: ${filePath}`);
    return filePath;
  }

  async saveReport(jobName: string): Promise<string | null> {
    if (this.errors.length === 0) return null;

    await mkdir(LOG_DIR, { recursive: true });
    const filePath = join(LOG_DIR, `${jobName}_errors_${Date.now()}.json`);
    await writeFile(filePath, JSON.stringify(this.errors, null, 2), "utf-8");
    logger.info(`Error report saved: ${filePath} (${this.errors.length} errors)`);
    return filePath;
  }

  get errorCount(): number {
    return this.errors.length;
  }

  get allErrors(): ErrorRecord[] {
    return [...this.errors];
  }
}
