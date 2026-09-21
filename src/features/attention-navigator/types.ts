export type AttentionAnswer = "yes" | "no" | "unknown";

export type GateQuestionId =
  | "playbook_target"
  | "market_environment"
  | "pa_shrink"
  | "breakout_confirmed";

export type JudgmentQuestionId =
  | "price_location"
  | "bottom_quality"
  | "retest_integrity"
  | "lower_timeframe_alignment"
  | "take_profit_fit"
  | "volatility_sufficient"
  | "risk_defined";

export type AttentionQuestionId = GateQuestionId | JudgmentQuestionId;
export type GateResult = "stop" | "hold" | "pass";
export type FinalDecision = "skip" | "monitor" | "consider_trade";
export type AttentionPhase =
  | "setup"
  | "gate"
  | "judgment"
  | "decision"
  | "result";

export type AttentionQuestion<TId extends AttentionQuestionId> = {
  id: TId;
  displayNumber: string;
  title: string;
  prompt: string;
  guidance: string[];
  memoExamples?: string[];
  learningAid?: {
    imageSrc?: string;
    imageAlt?: string;
    videoUrl?: string;
    videoLabel?: string;
  };
};

export type AttentionAnswerRecord = {
  id: AttentionQuestionId;
  answer: AttentionAnswer;
  reason: string;
  elapsed_ms: number;
};

export type AttentionPair = {
  id: string;
  symbol: string;
};
