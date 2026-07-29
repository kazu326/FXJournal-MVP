import { deriveFeedbackSignal } from "../feedback-engine";

describe("deriveFeedbackSignal", () => {
  it("prioritizes an explicit support request", () => {
    expect(
      deriveFeedbackSignal({
        supportRequested: true,
        recordCount: 0,
        answers: [1, 1, 1, 1, 1],
      }),
    ).toBe("support_requested");
  });

  it("uses insufficient_data when there are no records", () => {
    expect(
      deriveFeedbackSignal({
        supportRequested: false,
        recordCount: 0,
        answers: [5, 5, 5, 5, 5],
      }),
    ).toBe("insufficient_data");
  });

  it("routes a low item to staff follow-up without producing a risk score", () => {
    expect(
      deriveFeedbackSignal({
        supportRequested: false,
        recordCount: 4,
        answers: [4, 2, 4, null, 4],
      }),
    ).toBe("followup");
  });

  it("recognizes an on-track pattern from answered items", () => {
    expect(
      deriveFeedbackSignal({
        supportRequested: false,
        recordCount: 4,
        answers: [4, 4, 5, null, 4],
      }),
    ).toBe("on_track");
  });

  it("keeps middle-range responses in monitoring", () => {
    expect(
      deriveFeedbackSignal({
        supportRequested: false,
        recordCount: 4,
        answers: [3, 3, 4, 3, 3],
      }),
    ).toBe("monitoring");
  });
});
