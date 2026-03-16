import { writeFile } from "node:fs/promises";
import { stringify } from "csv-stringify/sync";

export async function writeCsv(
  data: Record<string, unknown>[],
  outputPath?: string
): Promise<void> {
  if (data.length === 0) return;

  const csvStr = stringify(data, {
    header: true,
    columns: Object.keys(data[0]),
  });

  if (outputPath) {
    await writeFile(outputPath, "\uFEFF" + csvStr, "utf-8"); // BOM for Excel
  } else {
    process.stdout.write(csvStr);
  }
}
