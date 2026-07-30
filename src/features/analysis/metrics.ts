import type { AnalysisRecord, AnalysisSummary } from "./types";

const percentage = (numerator: number, denominator: number) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 100);

export function summarizeAnalysisRecords(
  records: AnalysisRecord[],
): AnalysisSummary {
  let tradeRecords = 0;
  let skipRecords = 0;
  let completedRecords = 0;
  let ruleEvidenceCount = 0;
  let ruleAdherenceCount = 0;

  for (const record of records) {
    if (record.recordType === "skip") {
      skipRecords += 1;
    } else if (
      record.recordType === "valid" ||
      record.recordType === "invalid"
    ) {
      tradeRecords += 1;
    }

    if (record.completedAt) completedRecords += 1;
    if (record.postRuleRespected !== null) {
      ruleEvidenceCount += 1;
      if (record.postRuleRespected) ruleAdherenceCount += 1;
    }
  }

  return {
    totalRecords: records.length,
    tradeRecords,
    skipRecords,
    completedRecords,
    completionRate: percentage(completedRecords, records.length),
    ruleEvidenceCount,
    ruleAdherenceRate: percentage(ruleAdherenceCount, ruleEvidenceCount),
  };
}
