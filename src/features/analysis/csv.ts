import { ANALYSIS_COLUMNS } from "./schema";
import type { AnalysisPeriod, AnalysisRecord } from "./types";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function serializeCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);

  const safeValue = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function serializeAnalysisCsv(
  records: AnalysisRecord[],
  includeNotes: boolean,
): string {
  const header = ANALYSIS_COLUMNS.map((column) =>
    serializeCell(column.key),
  ).join(",");
  const rows = records.map((record) =>
    ANALYSIS_COLUMNS.map((column) =>
      serializeCell(column.value(record, includeNotes)),
    ).join(","),
  );

  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function buildAnalysisFilename(
  period: AnalysisPeriod,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  return `fxjournal_analysis_${period}_${date}_schema-v1.csv`;
}

export function downloadAnalysisCsv(
  records: AnalysisRecord[],
  period: AnalysisPeriod,
  includeNotes: boolean,
): void {
  const csv = serializeAnalysisCsv(records, includeNotes);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = buildAnalysisFilename(period);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
