import { parse } from "csv-parse/sync";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepts either a proper CSV (with or without a header row containing an
 * "email" column) or a plain newline/comma separated text blob, and returns
 * the deduplicated list of valid-looking email addresses found in it.
 */
export function parseLeadsFile(buffer: Buffer, filename: string): string[] {
  const text = buffer.toString("utf-8");
  const found = new Set<string>();

  if (filename.toLowerCase().endsWith(".csv")) {
    try {
      const records: Record<string, string>[] = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      for (const row of records) {
        const candidate = row.email ?? row.Email ?? Object.values(row)[0];
        if (candidate && EMAIL_REGEX.test(candidate.trim())) {
          found.add(candidate.trim().toLowerCase());
        }
      }
      if (found.size > 0) return Array.from(found);
    } catch {
      // fall through to plain-text extraction below
    }
  }

  // Plain text fallback: split on any whitespace/comma/semicolon/newline.
  const tokens = text.split(/[\s,;]+/);
  for (const token of tokens) {
    if (EMAIL_REGEX.test(token)) found.add(token.toLowerCase());
  }
  return Array.from(found);
}
