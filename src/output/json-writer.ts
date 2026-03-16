import { writeFile } from "node:fs/promises";

export async function writeJson(data: unknown, outputPath?: string): Promise<void> {
  const jsonStr = JSON.stringify(data, null, 2);

  if (outputPath) {
    await writeFile(outputPath, jsonStr, "utf-8");
  } else {
    process.stdout.write(jsonStr + "\n");
  }
}
