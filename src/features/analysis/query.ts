import { supabase } from "../../lib/supabase";
import {
  collectAllPages,
  getAnalysisPeriodStart,
} from "./pagination";
import { ANALYSIS_SELECT_COLUMNS } from "./schema";
import {
  normalizeAnalysisRecord,
  type AnalysisPeriod,
  type AnalysisRecord,
} from "./types";

export async function fetchAnalysisRecords(
  userId: string,
  period: AnalysisPeriod,
): Promise<AnalysisRecord[]> {
  const periodStart = getAnalysisPeriodStart(period);

  const rows = await collectAllPages<Record<string, unknown>>(
    async (from, to) => {
      let query = supabase
        .from("trade_logs")
        .select(ANALYSIS_SELECT_COLUMNS)
        .eq("user_id", userId)
        .is("voided_at", null)
        .order("occurred_at", { ascending: true });

      if (periodStart) {
        query = query.gte("occurred_at", periodStart);
      }

      const { data, error } = await query.range(from, to);
      return {
        data: data as unknown as Record<string, unknown>[] | null,
        error: error ? { message: error.message } : null,
      };
    },
  );

  return rows.map(normalizeAnalysisRecord);
}
