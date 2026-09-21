import { validateQ1Output, validateQ2Output } from "../outputValidation";

describe("Jev structured output validation", () => {
  test.each(["yes", "no", "unknown"] as const)("accepts %s", (answer) => {
    expect(validateQ1Output({ answer, confidence: 0.5, reason_codes: ["mixed_structure"] }).answer).toBe(answer);
  });

  test.each([0, 1])("accepts confidence boundary %p", (confidence) => {
    expect(validateQ2Output({ answer: "unknown", confidence, reason_codes: ["insufficient_data"] }).confidence).toBe(confidence);
  });

  test.each([-0.01, 1.01])("rejects confidence %p", (confidence) => {
    expect(() => validateQ1Output({ answer: "yes", confidence, reason_codes: [] })).toThrow("between 0 and 1");
  });

  test("rejects unknown reason codes", () => {
    expect(() => validateQ2Output({ answer: "no", confidence: 0.8, reason_codes: ["invented"] })).toThrow(
      "unsupported",
    );
  });

  test.each([null, [], { answer: "yes" }, { answer: "maybe", confidence: 0.5, reason_codes: [] }])(
    "rejects malformed response %p",
    (value) => expect(() => validateQ1Output(value)).toThrow(),
  );
});
