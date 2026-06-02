/** Escape a cell for CSV (RFC 4180). */
export function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Prefix so Excel opens UTF-8 correctly. */
export function csvWithBom(content: string): string {
  return `\uFEFF${content}`;
}
