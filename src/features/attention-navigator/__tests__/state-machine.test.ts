import { GATE_QUESTIONS, JUDGMENT_QUESTIONS } from "../questions";
import {
  answersElapsedSeconds,
  isHardVeto,
  nextJudgmentIndex,
  resolveGateTransition,
} from "../state-machine";

describe("Attention Navigator state machine", () => {
  test.each([
    ["playbook_target", "no", "stop"],
    ["market_environment", "no", "stop"],
    ["pa_shrink", "no", "hold"],
    ["breakout_confirmed", "no", "hold"],
    ["playbook_target", "unknown", "hold"],
    ["market_environment", "unknown", "hold"],
    ["pa_shrink", "unknown", "hold"],
    ["breakout_confirmed", "unknown", "hold"],
  ] as const)("%s + %s => %s", (questionId, answer, result) => {
    expect(resolveGateTransition(questionId, answer)).toEqual({
      kind: "complete",
      result,
    });
  });

  test("advances through YES answers and passes on Q4", () => {
    expect(resolveGateTransition("playbook_target", "yes")).toEqual({
      kind: "next",
      nextIndex: 1,
    });
    expect(resolveGateTransition("breakout_confirmed", "yes")).toEqual({
      kind: "complete",
      result: "pass",
    });
  });

  test("keeps the requested question order", () => {
    expect(GATE_QUESTIONS.map((question) => question.id)).toEqual([
      "playbook_target",
      "market_environment",
      "pa_shrink",
      "breakout_confirmed",
    ]);
    expect(JUDGMENT_QUESTIONS.map((question) => question.displayNumber)).toEqual([
      "①",
      "③",
      "②",
      "⑥",
      "④",
      "⑤",
      "⑦",
    ]);
  });

  test("only NO on question 5 or 7 triggers a hard veto", () => {
    expect(isHardVeto("volatility_sufficient", "no")).toBe(true);
    expect(isHardVeto("risk_defined", "no")).toBe(true);
    expect(isHardVeto("volatility_sufficient", "unknown")).toBe(false);
    expect(isHardVeto("take_profit_fit", "no")).toBe(false);
  });

  test("stops after the final judgment question", () => {
    expect(nextJudgmentIndex("price_location")).toBe(1);
    expect(nextJudgmentIndex("risk_defined")).toBeNull();
  });

  test("rounds answer time totals to seconds", () => {
    expect(
      answersElapsedSeconds([
        { id: "playbook_target", answer: "yes", reason: "", elapsed_ms: 900 },
        { id: "market_environment", answer: "yes", reason: "", elapsed_ms: 700 },
      ]),
    ).toBe(2);
  });
});

