import * as cheerio from "cheerio";

export function extractBySelectors(
  html: string,
  fields: Record<string, string>
): Record<string, unknown>[] {
  const $ = cheerio.load(html);

  // Collect all field values independently
  const fieldArrays: Record<string, (string | null)[]> = {};

  for (const [key, selectorStr] of Object.entries(fields)) {
    const parsed = parseSelector(selectorStr);
    const elements = $(parsed.selector);
    const values: (string | null)[] = [];

    elements.each((_, el) => {
      values.push(extractValue($, $(el), parsed.pseudo));
    });

    fieldArrays[key] = values;
  }

  // Determine max length across all fields
  const maxLen = Math.max(...Object.values(fieldArrays).map((arr) => arr.length), 0);

  if (maxLen === 0) {
    return [];
  }

  // If all fields have the same count, pair by index
  // If counts differ, still pair by index (padding with null)
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < maxLen; i++) {
    const row: Record<string, unknown> = {};
    for (const [key, values] of Object.entries(fieldArrays)) {
      row[key] = i < values.length ? values[i] : null;
    }
    results.push(row);
  }

  return results;
}

interface ParsedSelector {
  selector: string;
  pseudo?: string;
}

function parseSelector(raw: string): ParsedSelector {
  const textMatch = raw.match(/^(.+?)::text$/);
  if (textMatch) {
    return { selector: textMatch[1], pseudo: "text" };
  }

  const attrMatch = raw.match(/^(.+?)::attr\((.+?)\)$/);
  if (attrMatch) {
    return { selector: attrMatch[1], pseudo: `attr:${attrMatch[2]}` };
  }

  return { selector: raw };
}

function extractValue(
  $: cheerio.CheerioAPI,
  $el: ReturnType<cheerio.CheerioAPI>,
  pseudo?: string
): string | null {
  if (!$el.length) return null;

  if (!pseudo) {
    return $el.html()?.trim() ?? null;
  }

  if (pseudo === "text") {
    return $el.text()?.trim() ?? null;
  }

  if (pseudo.startsWith("attr:")) {
    const attrName = pseudo.slice(5);
    return $el.attr(attrName) ?? null;
  }

  return $el.text()?.trim() ?? null;
}
