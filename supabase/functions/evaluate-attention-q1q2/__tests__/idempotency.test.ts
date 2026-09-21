import { decideRunAction } from "../idempotency";

describe("run idempotency", () => {
  test("creates only when no session run exists", () => {
    expect(decideRunAction(null)).toBe("create");
  });

  test.each(["pending", "running", "completed", "failed"] as const)(
    "does not create a second run when the first is %s",
    (status) => expect(decideRunAction({ status })).toBe("skip"),
  );
});
