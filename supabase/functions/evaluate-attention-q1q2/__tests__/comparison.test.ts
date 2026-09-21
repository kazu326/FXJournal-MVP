import { compareHumanAndJev } from "../comparison";

describe("human/Jev comparison", () => {
  test.each([
    ["yes", "yes", "same"],
    ["yes", "no", "different"],
    ["yes", "unknown", "jev_unknown"],
    ["no", "yes", "different"],
    ["no", "no", "same"],
    ["no", "unknown", "jev_unknown"],
    ["unknown", "yes", "human_unknown"],
    ["unknown", "no", "human_unknown"],
    ["unknown", "unknown", "both_unknown"],
    [null, "yes", "not_answered"],
  ] as const)("compares %p with %p", (human, jev, expected) => {
    expect(compareHumanAndJev(human, jev)).toBe(expected);
  });
});
