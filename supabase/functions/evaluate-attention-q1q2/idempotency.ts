export type ExistingRun = { status: "pending" | "running" | "completed" | "failed" } | null;
export type RunAction = "create" | "skip";

export function decideRunAction(existing: ExistingRun): RunAction {
  // v0.1 does not retry failed runs and never duplicates an attention session.
  return existing === null ? "create" : "skip";
}
