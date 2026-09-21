import { ExperimentError, type AssetKey, type OhlcBar } from "../types.ts";

export type GetBarsRequest = {
  asset: AssetKey | { sessionSymbol: string };
  timeframe: "H1" | "H4";
  limit: number;
  endAt: string;
  confirmedOnly: true;
};

export interface MarketDataProvider {
  getBars(request: GetBarsRequest): Promise<OhlcBar[]>;
  /** Maps semantic assets to provider tickers inside an adapter, never in Jev logic. */
  getProviderTicker(asset: AssetKey): string | null;
}

export class UnavailableMarketDataProvider implements MarketDataProvider {
  getProviderTicker(asset: AssetKey): string | null {
    void asset;
    return null;
  }

  async getBars(request: GetBarsRequest): Promise<OhlcBar[]> {
    void request;
    throw new ExperimentError(
      "MARKET_DATA_UNAVAILABLE",
      "No market-data provider is configured for the Q1/Q2 experiment.",
    );
  }
}
