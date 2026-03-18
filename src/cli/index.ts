#!/usr/bin/env node

import { Command } from "commander";
import { fetchCommand } from "./fetch.js";
import { runCommand } from "./run.js";
import { scheduleCommand } from "./schedule.js";
import { profileCommand } from "./profile.js";
import { htmlCommand } from "./html.js";
import { reviewCommand } from "./review.js";

const program = new Command();

program
  .name("webcrawl")
  .version("1.0.0")
  .description("Adaptive web scraping CLI powered by Playwright & Scrapling");

program.addCommand(fetchCommand);
program.addCommand(runCommand);
program.addCommand(scheduleCommand);
program.addCommand(profileCommand);
program.addCommand(htmlCommand);
program.addCommand(reviewCommand);

program.parse(process.argv);
