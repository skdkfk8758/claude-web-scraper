import cron, { type ScheduledTask } from "node-cron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../error/reporter.js";

const SCHEDULE_FILE = join(process.cwd(), "data", "schedules.json");

export interface ScheduleEntry {
  name: string;
  configPath: string;
  cronExpr: string;
  createdAt: string;
  enabled: boolean;
}

export class CronManager {
  private tasks: Map<string, ScheduledTask> = new Map();
  private entries: ScheduleEntry[] = [];
  private onExecute: (configPath: string) => Promise<void>;

  constructor(onExecute: (configPath: string) => Promise<void>) {
    this.onExecute = onExecute;
  }

  async load(): Promise<void> {
    if (!existsSync(SCHEDULE_FILE)) {
      this.entries = [];
      return;
    }
    const raw = await readFile(SCHEDULE_FILE, "utf-8");
    this.entries = JSON.parse(raw);
  }

  async save(): Promise<void> {
    await mkdir(join(process.cwd(), "data"), { recursive: true });
    await writeFile(SCHEDULE_FILE, JSON.stringify(this.entries, null, 2), "utf-8");
  }

  async add(name: string, configPath: string, cronExpr: string): Promise<void> {
    if (!cron.validate(cronExpr)) {
      throw new Error(`Invalid cron expression: ${cronExpr}`);
    }

    this.entries = this.entries.filter((e) => e.name !== name);
    this.entries.push({
      name,
      configPath,
      cronExpr,
      createdAt: new Date().toISOString(),
      enabled: true,
    });

    await this.save();
    logger.info(`Schedule added: ${name} (${cronExpr})`);
  }

  async remove(name: string): Promise<boolean> {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.name !== name);
    if (this.entries.length === before) return false;

    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
    }

    await this.save();
    logger.info(`Schedule removed: ${name}`);
    return true;
  }

  list(): ScheduleEntry[] {
    return [...this.entries];
  }

  startAll(): void {
    for (const entry of this.entries) {
      if (!entry.enabled) continue;
      this.startOne(entry);
    }
    logger.info(`Started ${this.tasks.size} scheduled jobs`);
  }

  private startOne(entry: ScheduleEntry): void {
    if (this.tasks.has(entry.name)) {
      this.tasks.get(entry.name)!.stop();
    }

    const task = cron.schedule(entry.cronExpr, async () => {
      logger.info(`Running scheduled job: ${entry.name}`);
      try {
        await this.onExecute(entry.configPath);
      } catch (err) {
        logger.error(`Scheduled job failed: ${entry.name} - ${err}`);
      }
    });

    this.tasks.set(entry.name, task);
  }

  stopAll(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`Stopped: ${name}`);
    }
    this.tasks.clear();
  }
}
