import type { AnalysisRecord } from "./types";

export type AnalysisCoverageKey =
  | "preCheck"
  | "postRecord"
  | "ruleReview"
  | "hypothesisReview";

export type AnalysisCoverage = {
  key: AnalysisCoverageKey;
  label: string;
  count: number;
  total: number;
  rate: number | null;
};

export type AnalysisInsightTone = "positive" | "attention" | "neutral";

export type AnalysisInsight = {
  id: string;
  title: string;
  detail: string;
  tone: AnalysisInsightTone;
};

export type AnalysisBehaviorDetails = {
  mix: {
    valid: number;
    invalid: number;
    skip: number;
    unknown: number;
    live: number;
    practice: number;
  };
  coverage: AnalysisCoverage[];
  weekdays: Array<{
    label: string;
    count: number;
  }>;
  activeDays: number;
  insights: AnalysisInsight[];
};

const WEEKDAYS = [
  { key: "Mon", label: "月" },
  { key: "Tue", label: "火" },
  { key: "Wed", label: "水" },
  { key: "Thu", label: "木" },
  { key: "Fri", label: "金" },
  { key: "Sat", label: "土" },
  { key: "Sun", label: "日" },
] as const;

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const percentage = (numerator: number, denominator: number) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 100);

const isTradeRecord = (record: AnalysisRecord) =>
  record.recordType === "valid" || record.recordType === "invalid";

function buildCoverage(
  preCheckCount: number,
  postRecordCount: number,
  ruleReviewCount: number,
  hypothesisReviewCount: number,
  tradeCount: number,
): AnalysisCoverage[] {
  return [
    {
      key: "preCheck",
      label: "事前チェック",
      count: preCheckCount,
      total: tradeCount,
      rate: percentage(preCheckCount, tradeCount),
    },
    {
      key: "postRecord",
      label: "取引後記録",
      count: postRecordCount,
      total: tradeCount,
      rate: percentage(postRecordCount, tradeCount),
    },
    {
      key: "ruleReview",
      label: "ルール振り返り",
      count: ruleReviewCount,
      total: tradeCount,
      rate: percentage(ruleReviewCount, tradeCount),
    },
    {
      key: "hypothesisReview",
      label: "想定内の確認",
      count: hypothesisReviewCount,
      total: tradeCount,
      rate: percentage(hypothesisReviewCount, tradeCount),
    },
  ];
}

function buildInsights(
  totalRecords: number,
  tradeCount: number,
  mix: AnalysisBehaviorDetails["mix"],
  coverage: AnalysisCoverage[],
  weekdays: AnalysisBehaviorDetails["weekdays"],
): AnalysisInsight[] {
  if (totalRecords === 0) {
    return [
      {
        id: "no-data",
        title: "この期間はまだ集計できません",
        detail:
          "記録が追加されると、見送りを含む判断の内訳とデータの揃い方を確認できます。",
        tone: "neutral",
      },
    ];
  }

  const insights: AnalysisInsight[] = [];
  const postRecord = coverage.find((item) => item.key === "postRecord");
  const ruleReview = coverage.find((item) => item.key === "ruleReview");

  if (mix.skip > 0) {
    insights.push({
      id: "skip-recorded",
      title: "見送りの判断も記録されています",
      detail: `${mix.skip}件の見送りを、取引と同じ分析対象として残せています。`,
      tone: "positive",
    });
  }

  if (tradeCount > 0 && postRecord && postRecord.count < tradeCount) {
    insights.push({
      id: "post-record-missing",
      title: "取引後記録に未完了があります",
      detail: `${tradeCount}件中${postRecord.count}件が完了しています。未完了分を補うと、判断と結果をつなげて振り返れます。`,
      tone: "attention",
    });
  }

  if (tradeCount > 0 && ruleReview && ruleReview.count < tradeCount) {
    insights.push({
      id: "rule-review-missing",
      title: "ルール遵守の回答を増やせます",
      detail: `${tradeCount}件中${ruleReview.count}件で確認できます。回答が揃うほど、期間内の傾向を判断しやすくなります。`,
      tone: "neutral",
    });
  }

  if (mix.invalid > 0) {
    insights.push({
      id: "invalid-recorded",
      title: "ルール外の記録があります",
      detail: `${mix.invalid}件あります。良し悪しを断定せず、その前後に残した事実から共通点を確認できます。`,
      tone: "attention",
    });
  }

  if (totalRecords >= 5) {
    let busiest = weekdays[0];
    for (const weekday of weekdays) {
      if (weekday.count > busiest.count) busiest = weekday;
    }
    const share = percentage(busiest.count, totalRecords);
    if (share !== null && share >= 50) {
      insights.push({
        id: "weekday-concentration",
        title: `${busiest.label}曜日に記録が集まっています`,
        detail: `期間内の記録の${share}%です。曜日による偏りとして、今後も続くかを観察できます。`,
        tone: "neutral",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "coverage-complete",
      title: "振り返りに必要な回答が揃っています",
      detail:
        "この期間は、事前チェックから取引後の振り返りまで一貫して確認できます。",
      tone: "positive",
    });
  }

  if (totalRecords < 5) {
    insights.push({
      id: "small-sample",
      title: "傾向を見るには記録がもう少し必要です",
      detail: `現在${totalRecords}件です。記録が増えると、曜日の偏りや回答の揃い方を比較しやすくなります。`,
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}

export function buildAnalysisBehaviorDetails(
  records: AnalysisRecord[],
): AnalysisBehaviorDetails {
  const mix: AnalysisBehaviorDetails["mix"] = {
    valid: 0,
    invalid: 0,
    skip: 0,
    unknown: 0,
    live: 0,
    practice: 0,
  };
  const weekdayCounts = new Map<string, number>(
    WEEKDAYS.map((weekday) => [weekday.key, 0]),
  );
  const activeDateKeys = new Set<string>();
  let tradeCount = 0;
  let preCheckCount = 0;
  let postRecordCount = 0;
  let ruleReviewCount = 0;
  let hypothesisReviewCount = 0;

  for (const record of records) {
    mix[record.recordType] += 1;

    const occurredAt = new Date(record.occurredAt);
    if (!Number.isNaN(occurredAt.getTime())) {
      const weekday = weekdayFormatter.format(occurredAt);
      if (weekdayCounts.has(weekday)) {
        weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
      }
      activeDateKeys.add(dateKeyFormatter.format(occurredAt));
    }

    if (!isTradeRecord(record)) continue;
    tradeCount += 1;
    if (record.mode === "live") mix.live += 1;
    if (record.mode === "practice") mix.practice += 1;

    if (
      record.gateTradeCountOk !== null &&
      record.gateRrOk !== null &&
      record.gateRiskOk !== null &&
      record.gateRuleOk !== null
    ) {
      preCheckCount += 1;
    }
    if (record.completedAt) postRecordCount += 1;
    if (record.postRuleRespected !== null) ruleReviewCount += 1;
    if (record.postWithinHypothesis !== null) hypothesisReviewCount += 1;
  }

  const coverage = buildCoverage(
    preCheckCount,
    postRecordCount,
    ruleReviewCount,
    hypothesisReviewCount,
    tradeCount,
  );
  const weekdays = WEEKDAYS.map((weekday) => ({
    label: weekday.label,
    count: weekdayCounts.get(weekday.key) ?? 0,
  }));

  return {
    mix,
    coverage,
    weekdays,
    activeDays: activeDateKeys.size,
    insights: buildInsights(
      records.length,
      tradeCount,
      mix,
      coverage,
      weekdays,
    ),
  };
}
