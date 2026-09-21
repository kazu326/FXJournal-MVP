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
    title: "4時間足の上昇トレンド",
    prompt: "4時間足は上昇トレンドですか？（ダウ理論）",
    guidance: [
      "高値・安値の切り上げなどを見て、4時間足が上昇トレンドと言えるか確認します。",
      "レンジ・下降ならNO、判断に迷う場合は「？」を選びます。",
    ],
  },
  {
    id: "market_environment",
    displayNumber: "Q2",
    title: "相場環境の確認",
    prompt: "今は通常どおりチャート判断を続けられる相場ですか？",
    guidance: [
      "株・GOLD・Cryptoなどの同時急落がないか確認します。",
      "明らかな現金化（cash-out）や、指標直後の異常な値動きがある場合はNOです。",
    ],
  },
  {
    id: "pa_shrink",
    displayNumber: "Q3",
    title: "押し目のレンジ・持ち合い",
    prompt: "押し目の中で、レンジや持ち合いができてきていますか？",
    guidance: [
      "上昇の途中で押しが入り、その後に値動きがまとまってきているかを見ます。",
      "三角持ち合い、フラッグなどの形になることがあります。",
      "形の名前そのものより、流れの中で値動きがまとまってきているかを確認します。",
    ],
    learningAid: {
      imageSrc: "/attention-navigator/q3-full-return-convergence.png",
      imageAlt:
        "上昇トレンドからレンジ、下抜け、全戻し、押し戻し、収束へ進む参考図",
      videoUrl:
        "https://youtu.be/-YSI9VNhS8o?si=iQqYdbj5lp8aBSAx&t=410",
      videoLabel: "講師の解説動画を見る（6:50〜）",
    },
  },
  {
    id: "breakout_confirmed",
    displayNumber: "Q4",
    title: "ブレイク確認",
    prompt:
      "ここまでの条件がそろった上で、持ち合いを上に抜けましたか？（ブレイク確認）",
    guidance: [
      "下へのダマシ後に全戻しし、押しても崩れず、再び上方向へ進む流れを確認します。",
      "持ち合い・収束を上に抜けたかを確認します。",
    ],
    learningAid: {
      imageSrc: "/attention-navigator/q4-triangle-breakout.png",
      imageAlt: "三角持ち合いから上方向へブレイクする参考図",
      videoUrl:
        "https://youtu.be/-YSI9VNhS8o?si=iQqYdbj5lp8aBSAx&t=410",
      videoLabel: "講師の解説動画を見る（6:50〜）",
    },
  },
];

export const JUDGMENT_QUESTIONS: AttentionQuestion<JudgmentQuestionId>[] = [
  {
    id: "price_location",
    displayNumber: "①",
    title: "ブレイク後の価格位置",
    prompt: "ブレイク後、今の価格はまだ狙える位置ですか？（価格位置）",
    guidance: [
      "すでに大きく伸びた後ではないか、追いかける位置になっていないかを確認します。",
    ],
  },
  {
    id: "bottom_quality",
    displayNumber: "③",
    title: "底堅さ・押し目の質",
    prompt: "押し目は底堅く見えますか？（底堅さ・押し目の質）",
    guidance: [
      "下ヒゲや安値の切り上げなど、下げ止まっている材料があるか確認します。",
    ],
  },
  {
    id: "retest_integrity",
    displayNumber: "②",
    title: "押し戻し・再テスト",
    prompt: "ブレイク後の押し戻しで、形が崩れていませんか？（再テスト）",
    guidance: ["ブレイクした根拠がまだ保たれているかを確認します。"],
  },
  {
    id: "lower_timeframe_alignment",
    displayNumber: "⑥",
    title: "下位足との整合",
    prompt:
      "下位足の値動きは、4時間足の方向と大きく矛盾していませんか？（下位足PA）",
    guidance: [
      "短期の値動きが、上位足の方向に強く逆らっていないか確認します。",
    ],
  },
  {
    id: "take_profit_fit",
    displayNumber: "④",
    title: "利確の置き方",
    prompt: "利確の置き方は、今の相場に合っていますか？",
    guidance: [
      "取れそうな値幅や、近くの高値・抵抗帯を見て確認します。",
    ],
  },
  {
    id: "volatility_sufficient",
    displayNumber: "⑤",
    title: "ボラティリティ",
    prompt:
      "今の値動きは、ポジションを考えられる範囲ですか？（ボラティリティ）",
    guidance: [
      "値動きが荒れすぎていたり、急激に拡大していないか確認します。",
      "NOの場合は本判断を終了します。",
    ],
  },
  {
    id: "risk_defined",
    displayNumber: "⑦",
    title: "損切り・リスク・無効化条件",
    prompt:
      "入る前に、損切り位置・許容リスク・判断が崩れる条件を言えますか？",
    guidance: [
      "どこで間違いと判断するかを、ポジションを考える前に確認します。",
      "NOの場合は本判断を終了します。",
    ],
  },
];
