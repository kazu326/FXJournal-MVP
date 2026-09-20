import type {
  AttentionQuestion,
  GateQuestionId,
  JudgmentQuestionId,
} from "./types";

export const ATTENTION_HTF = "H4";
export const CHART_TIMEFRAMES = ["M5", "M15", "M30", "H1"] as const;

export const GATE_QUESTIONS: AttentionQuestion<GateQuestionId>[] = [
  {
    id: "playbook_target",
    displayNumber: "Q1",
    title: "プレイブック対象か",
    prompt: "H4の条件を満たしていますか？",
    guidance: ["H4 EMA100 > EMA200", "close > EMA100"],
  },
  {
    id: "market_environment",
    displayNumber: "Q2",
    title: "通常どおり判断できる相場環境か",
    prompt: "チャート判断を続けられる通常の相場環境ですか？",
    guidance: [
      "株・GOLD・Cryptoの同時急落がない",
      "明らかなcash-outや異常な指標直後ではない",
    ],
  },
  {
    id: "pa_shrink",
    displayNumber: "Q3",
    title: "PA Shrinkが成立しているか",
    prompt: "レンジ縮小を確認できていますか？",
    guidance: ["current_range_width <= previous_range_width × 0.90"],
  },
  {
    id: "breakout_confirmed",
    displayNumber: "Q4",
    title: "ブレイク確認まで到達したか",
    prompt: "終値でレンジ上抜けを確認できていますか？",
    guidance: ["close > range_high + buffer", "GOLD（XAU/USD）の仮bufferは0.50"],
  },
];

export const JUDGMENT_QUESTIONS: AttentionQuestion<JudgmentQuestionId>[] = [
  {
    id: "price_location",
    displayNumber: "①",
    title: "ブレイク後の価格位置",
    prompt: "ブレイク後の価格位置は許容範囲ですか？",
    guidance: ["追いかけすぎていないかを確認します。"],
  },
  {
    id: "bottom_quality",
    displayNumber: "③",
    title: "底堅さ・押し目の質",
    prompt: "底堅さや押し目の質がありますか？",
    guidance: ["下ヒゲ、安値切り上げなどを確認します。"],
  },
  {
    id: "retest_integrity",
    displayNumber: "②",
    title: "押し戻し・再テスト",
    prompt: "押し戻しや再テストの形は崩れていませんか？",
    guidance: ["ブレイク根拠が維持されているかを確認します。"],
  },
  {
    id: "lower_timeframe_alignment",
    displayNumber: "⑥",
    title: "下位足PAとの整合",
    prompt: "下位足PAがHTF方向と矛盾していませんか？",
    guidance: ["H4方向と現在の値動きを照合します。"],
  },
  {
    id: "take_profit_fit",
    displayNumber: "④",
    title: "利確の置き方",
    prompt: "利確の置き方は相場環境に合っていますか？",
    guidance: ["値幅と抵抗帯を踏まえて確認します。"],
  },
  {
    id: "volatility_sufficient",
    displayNumber: "⑤",
    title: "ポジションを検討できるボラ",
    prompt: "実際にポジションを検討できる程度のボラですか？",
    guidance: ["NOの場合はHard vetoとなり、本判断を終了します。"],
  },
  {
    id: "risk_defined",
    displayNumber: "⑦",
    title: "損切・リスク・無効化条件",
    prompt: "損切・許容リスク・無効化条件を先に言えますか？",
    guidance: ["NOの場合はHard vetoとなり、本判断を終了します。"],
  },
];

