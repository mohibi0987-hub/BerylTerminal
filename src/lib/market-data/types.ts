export interface Quote {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface Bar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataService {
  getQuote(symbol: string): Promise<Quote>;
  getBars(symbol: string, interval: string, outputSize?: number): Promise<Bar[]>;
  // Streaming is optional — check before relying on it, since it depends on your provider tier
  // (e.g. Twelve Data's free Basic plan only gets trial WebSocket access; full streaming needs Pro+).
  subscribe?(symbols: string[], onQuote: (q: Quote) => void): () => void; // returns an unsubscribe fn
}
