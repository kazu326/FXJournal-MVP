import type { MacroEvent } from "../types.ts";

export interface MacroEventProvider {
  getNearestHighImpactUsdEvent(snapshotAt: string): Promise<MacroEvent>;
}

export class UnavailableMacroEventProvider implements MacroEventProvider {
  async getNearestHighImpactUsdEvent(snapshotAt: string): Promise<MacroEvent> {
    void snapshotAt;
    // unavailable is not equivalent to "no important event".
    return { available: false };
  }
}
