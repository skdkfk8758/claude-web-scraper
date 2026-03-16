import { Command } from "commander";
import { ProfileManager } from "../profile/manager.js";
import { spawnWithInput } from "../utils/spawn.js";
import { logger } from "../error/reporter.js";

const profileManager = new ProfileManager();

export const profileCommand = new Command("profile")
  .description("Manage site login profiles (cookies/sessions)");

profileCommand
  .command("login")
  .description("Login to a site and save the session profile")
  .argument("<name>", "Profile name")
  .option("--url <url>", "Login page URL")
  .action(async (name: string, options) => {
    if (!options.url) {
      logger.error("--url is required");
      process.exit(1);
    }

    try {
      logger.info(`Opening browser for login at: ${options.url}`);
      logger.info("Please login in the browser. The session will be saved when you close it.");

      const script = `
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(${JSON.stringify(options.url)});

// Wait for browser to close
await new Promise(resolve => {
  browser.on("disconnected", resolve);
  setTimeout(resolve, 300000); // 5 min max
});

const cookies = await context.cookies();
const result = JSON.stringify({ cookies, url: page.url() });
process.stdout.write(result);

await browser.close().catch(() => {});
`;

      const { stdout } = await spawnWithInput("node", ["--input-type=module"], script, {
        timeout: 310000,
      });

      const { cookies, url } = JSON.parse(stdout);

      await profileManager.save({
        name,
        url: options.url,
        cookies,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info(`Profile "${name}" saved with ${cookies.length} cookies`);
    } catch (err) {
      logger.error(`Login failed: ${err}`);
      process.exit(1);
    }
  });

profileCommand
  .command("list")
  .description("List all saved profiles")
  .action(async () => {
    const profiles = await profileManager.list();

    if (profiles.length === 0) {
      console.log("No saved profiles.");
      return;
    }

    console.log("\nSaved Profiles:");
    console.log("─".repeat(40));
    for (const name of profiles) {
      const p = await profileManager.load(name);
      console.log(`  ${name}`);
      if (p) {
        console.log(`    URL:     ${p.url}`);
        console.log(`    Cookies: ${p.cookies.length}`);
        console.log(`    Updated: ${p.updatedAt}`);
      }
      console.log("");
    }
  });

profileCommand
  .command("remove")
  .description("Remove a saved profile")
  .argument("<name>", "Profile name to remove")
  .action(async (name: string) => {
    const removed = await profileManager.remove(name);
    if (removed) {
      logger.info(`Profile "${name}" removed`);
    } else {
      logger.warn(`Profile "${name}" not found`);
    }
  });
