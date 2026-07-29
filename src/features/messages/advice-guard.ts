export type AdviceGuardResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: string };

const directRecommendationPatterns: Array<{
  pattern: RegExp;
  reason: string;
}> = [
  {
    pattern:
      /(?:今|今日|現在|次).{0,16}(?:買(?:い|う)|売(?:り|る)|エントリー)(?:して|する|がよい|がおすすめ|すべき)/u,
    reason: "特定のタイミングでの売買を勧める表現が含まれています。",
  },
  {
    pattern:
      /(?:買(?:い|う)|売(?:り|る)|エントリー)(?:して|する|がよい|がおすすめ|すべき).{0,16}(?:今|今日|現在|次)/u,
    reason: "特定のタイミングでの売買を勧める表現が含まれています。",
  },
  {
    pattern:
      /(?:ドル円|ユーロ円|ポンド円|ユーロドル|USD\/?JPY|EUR\/?JPY|GBP\/?JPY|EUR\/?USD).{0,20}(?:買い|売り|ロング|ショート)(?:です|推奨|がおすすめ|すべき)?/iu,
    reason: "特定の通貨ペアへの方向性を示す表現が含まれています。",
  },
  {
    pattern:
      /(?:損切り|利確).{0,16}(?:\d+(?:\.\d+)?\s*(?:円|pips?|ポイント)|価格|レート)(?:に|で|がおすすめ|すべき)/iu,
    reason: "具体的な損切り・利確水準を示す表現が含まれています。",
  },
  {
    pattern:
      /\d+(?:\.\d+)?\s*(?:ロット|lots?|lot)(?:で|がよい|がおすすめ|にして|にする)/iu,
    reason: "具体的な取引数量を勧める表現が含まれています。",
  },
];

/**
 * 運営発信の文章が、習慣支援を越えて具体的な投資判断を勧めていないかを確認する。
 * 学習用語そのものは許可し、銘柄・方向・タイミング・数量を直接勧める表現だけを止める。
 */
export function assessOutboundMessage(body: string): AdviceGuardResult {
  const normalized = body.trim().replace(/\s+/gu, " ");

  for (const rule of directRecommendationPatterns) {
    if (rule.pattern.test(normalized)) {
      return { allowed: false, reason: rule.reason };
    }
  }

  return { allowed: true, reason: null };
}
