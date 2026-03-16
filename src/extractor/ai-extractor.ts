import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../error/reporter.js";

const AI_OUTPUT_DIR = join(process.cwd(), "data", ".ai-extract");

export function cleanHtml(html: string, maxLength: number = 50000): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, link, meta, head").remove();
  $("[style]").removeAttr("style");
  $("[class]").removeAttr("class");
  $("[id]").removeAttr("id");

  let text = $("body").html() ?? html;
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + "\n... (truncated)";
  }

  return text;
}

export async function extractWithAI(
  html: string,
  prompt: string
): Promise<Record<string, unknown>[]> {
  const cleanedHtml = cleanHtml(html);

  await mkdir(AI_OUTPUT_DIR, { recursive: true });

  const timestamp = Date.now();
  const htmlPath = join(AI_OUTPUT_DIR, `page_${timestamp}.html`);
  const promptPath = join(AI_OUTPUT_DIR, `prompt_${timestamp}.txt`);

  await writeFile(htmlPath, cleanedHtml, "utf-8");
  await writeFile(
    promptPath,
    `# AI Extraction Request\n\n## Prompt\n${prompt}\n\n## Source HTML\n${htmlPath}\n`,
    "utf-8"
  );

  logger.info(`Cleaned HTML saved: ${htmlPath} (${cleanedHtml.length} chars)`);
  logger.info(`Extraction prompt saved: ${promptPath}`);
  logger.info(
    "AI extraction requires Claude Code context. Read the saved HTML file and process it in the conversation."
  );

  return [
    {
      _ai_extract: true,
      prompt,
      htmlPath,
      htmlLength: cleanedHtml.length,
      message:
        "HTML saved for AI extraction. Use Claude Code to read and extract data from the saved file.",
    },
  ];
}
