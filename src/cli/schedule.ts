import { Command } from "commander";
import { CronManager } from "../scheduler/cron-manager.js";
import { loadConfig } from "../core/config-loader.js";
import { executeJob } from "../core/orchestrator.js";
import { logger } from "../error/reporter.js";

const cronManager = new CronManager(async (configPath: string) => {
  const config = await loadConfig(configPath);
  await executeJob(config);
});

export const scheduleCommand = new Command("schedule")
  .description("Manage scheduled scraping jobs");

scheduleCommand
  .command("add")
  .description("Add a scheduled job")
  .argument("<config>", "Path to YAML config file")
  .option("--cron <expr>", "Cron expression (e.g., '0 9 * * *')")
  .option("--name <name>", "Schedule name (defaults to job name)")
  .action(async (configPath: string, options) => {
    try {
      const config = await loadConfig(configPath);
      const name = options.name ?? config.name;
      const cronExpr = options.cron ?? config.schedule;

      if (!cronExpr) {
        logger.error("No cron expression provided. Use --cron or define schedule in YAML");
        process.exit(1);
      }

      await cronManager.load();
      await cronManager.add(name, configPath, cronExpr);
      logger.info(`Schedule "${name}" added: ${cronExpr}`);
    } catch (err) {
      logger.error(`Failed to add schedule: ${err}`);
      process.exit(1);
    }
  });

scheduleCommand
  .command("list")
  .description("List all scheduled jobs")
  .action(async () => {
    await cronManager.load();
    const entries = cronManager.list();

    if (entries.length === 0) {
      console.log("No scheduled jobs.");
      return;
    }

    console.log("\nScheduled Jobs:");
    console.log("─".repeat(60));
    for (const entry of entries) {
      console.log(`  ${entry.name}`);
      console.log(`    Cron:    ${entry.cronExpr}`);
      console.log(`    Config:  ${entry.configPath}`);
      console.log(`    Enabled: ${entry.enabled}`);
      console.log(`    Created: ${entry.createdAt}`);
      console.log("");
    }
  });

scheduleCommand
  .command("remove")
  .description("Remove a scheduled job")
  .argument("<name>", "Schedule name to remove")
  .action(async (name: string) => {
    await cronManager.load();
    const removed = await cronManager.remove(name);
    if (removed) {
      logger.info(`Schedule "${name}" removed`);
    } else {
      logger.warn(`Schedule "${name}" not found`);
    }
  });

scheduleCommand
  .command("start")
  .description("Start the scheduler daemon (runs all enabled jobs)")
  .action(async () => {
    await cronManager.load();
    const entries = cronManager.list();

    if (entries.length === 0) {
      logger.warn("No scheduled jobs to start");
      return;
    }

    cronManager.startAll();
    logger.info(`Scheduler running with ${entries.length} job(s). Press Ctrl+C to stop.`);

    // Keep process alive
    process.on("SIGINT", () => {
      cronManager.stopAll();
      logger.info("Scheduler stopped");
      process.exit(0);
    });
  });
