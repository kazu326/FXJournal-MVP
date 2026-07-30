import type { AnalysisPeriod } from "./types";

const PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export type PageLoader<T> = (
  from: number,
  to: number,
) => Promise<PageResult<T>>;

export async function collectAllPages<T>(
  loadPage: PageLoader<T>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const records: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    records.push(...page);
    if (page.length < pageSize) return records;
  }
}

export function getAnalysisPeriodStart(
  period: AnalysisPeriod,
  now = new Date(),
): string | null {
  if (period === "all") return null;

  const days = period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start.toISOString();
}
