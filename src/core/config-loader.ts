import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const StepSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("click"), selector: z.string() }),
  z.object({ action: z.literal("wait"), selector: z.string().optional(), timeout: z.number().optional() }),
  z.object({ action: z.literal("scroll"), direction: z.enum(["down", "up", "infinite"]).default("down"), amount: z.number().optional() }),
  z.object({ action: z.literal("type"), selector: z.string(), text: z.string() }),
  z.object({ action: z.literal("screenshot"), path: z.string().optional() }),
  z.object({ action: z.literal("select"), selector: z.string(), value: z.string() }),
]);

const OutputSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  path: z.string().optional(),
});

const JobConfigSchema = z.object({
  name: z.string(),
  url: z.string().url().or(z.array(z.string().url())),
  profile: z.string().optional(),

  steps: z.array(StepSchema).optional(),

  fields: z.record(z.string(), z.string()).optional(),
  extract: z.string().optional(),

  adaptive: z.boolean().default(false),
  stealth: z.enum(["auto", "off", "cloudflare"]).default("auto"),

  output: OutputSchema.default({ format: "json" }),

  retry: z.number().default(3),
  screenshot_on_error: z.boolean().default(true),
  timeout: z.number().default(30000),

  schedule: z.string().optional(),
});

export type Step = z.infer<typeof StepSchema>;
export type OutputConfig = z.infer<typeof OutputSchema>;
export type JobConfig = z.infer<typeof JobConfigSchema>;

export async function loadConfig(filePath: string): Promise<JobConfig> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = parseYaml(raw);
  return JobConfigSchema.parse(parsed);
}

export function parseInlineConfig(options: {
  url: string;
  fields?: string[];
  extract?: string;
  output?: string;
  format?: string;
  stealth?: string;
  adaptive?: boolean;
  retry?: number;
  profile?: string;
}): JobConfig {
  const fields: Record<string, string> | undefined = options.fields
    ? Object.fromEntries(
        options.fields.map((f) => {
          const [key, ...rest] = f.split(":");
          return [key, rest.join(":")];
        })
      )
    : undefined;

  return JobConfigSchema.parse({
    name: "inline",
    url: options.url,
    fields,
    extract: options.extract,
    adaptive: options.adaptive ?? false,
    stealth: options.stealth ?? "auto",
    output: {
      format: options.format ?? "json",
      path: options.output,
    },
    retry: options.retry ?? 3,
    profile: options.profile,
  });
}

export { JobConfigSchema };
