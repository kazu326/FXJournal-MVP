import { ExperimentError, type Q1Input, type Q1Output, type Q2Input, type Q2Output } from "../types.ts";

export interface JevProvider {
  evaluateQ1(input: Q1Input): Promise<Q1Output>;
  evaluateQ2(input: Q2Input): Promise<Q2Output>;
}

export class UnavailableJevProvider implements JevProvider {
  async evaluateQ1(input: Q1Input): Promise<Q1Output> {
    void input;
    throw this.unconfigured();
  }

  async evaluateQ2(input: Q2Input): Promise<Q2Output> {
    void input;
    throw this.unconfigured();
  }

  private unconfigured(): ExperimentError {
    return new ExperimentError(
      "JEV_PROVIDER_UNCONFIGURED",
      "Jev endpoint, authentication, and request format are not configured.",
    );
  }
}
