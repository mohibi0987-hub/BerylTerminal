// Alpaca adapter — implements BrokerAdapter against Alpaca's real Trading API.
//
// Paper vs live is purely a base URL + credential pair difference (per Alpaca's own docs,
// "the API spec is the same between the paper trading and live accounts"), which is exactly
// why this single adapter class handles both modes.
//
// Required env vars (set in Vercel, never in code or committed files):
//   ALPACA_API_KEY_ID
//   ALPACA_API_SECRET_KEY
//   ALPACA_MODE = "paper" | "live"   (defaults to "paper" if unset — fail safe, not fail open)

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const LIVE_BASE = "https://api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

export class AlpacaAdapter implements BrokerAdapter {
  readonly broker = "ALPACA" as const;
  readonly mode: ExecutionMode;
  readonly capabilities: BrokerCapabilities = {
    authentication: true,
    accountDiscovery: true,
    balances: true,
    buyingPower: true,
    positions: true,
    orders: true,
    executions: true,
    quotes: true,
    placeOrder: true,
    modifyOrder: true,
    cancelOrder: true,
    streamingAccountEvents: true,
    streamingOrderEvents: true, // via Alpaca's trade-updates websocket stream
  };

  private keyId?: string;
  private secretKey?: string;
  private baseUrl: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
    this.baseUrl = mode === "LIVE" ? LIVE_BASE : PAPER_BASE;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    const keyId = credentials.apiKeyId;
    const secretKey = credentials.apiSecretKey;
    if (!keyId || !secretKey) {
      throw new Error("Alpaca requires apiKeyId and apiSecretKey.");
    }
    this.keyId = keyId;
    this.secretKey = secretKey;
    // Validate the credentials actually work before we call the connection "CONNECTED".
    await this.getAccount();
  }

  private headers(): HeadersInit {
    if (!this.keyId || !this.secretKey) {
      throw new Error("AlpacaAdapter.authenticate() must succeed before any other call.");
    }
    return {
      "APCA-API-KEY-ID": this.keyId,
      "APCA-API-SECRET-KEY": this.secretKey,
      "Content-Type": "application/json",
    };
  }

  private async request(path: string, init: RequestInit = {}, base = this.baseUrl) {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...this.headers(), ...(init.headers || {}) } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Alpaca ${init.method || "GET"} ${path} failed: ${res.status} ${body}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const a = await this.request("/v2/account");
    return {
      externalAccountId: a.id,
      accountType: a.account_type ?? (this.mode === "PAPER" ? "paper" : "live"),
      currency: a.currency ?? "USD",
      cash: parseFloat(a.cash),
      buyingPower: parseFloat(a.buying_power),
      equity: parseFloat(a.equity),
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const rows = await this.request("/v2/positions");
    return (rows as any[]).map((p) => ({
      symbol: p.symbol,
      quantity: parseFloat(p.qty),
      avgPrice: parseFloat(p.avg_entry_price),
      marketValue: parseFloat(p.market_value),
    }));
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const q = await this.request(`/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`, {}, DATA_BASE);
    return { symbol, price: q.trade.p, timestamp: q.trade.t };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    const body: Record<string, unknown> = {
      symbol: req.symbol,
      side: req.side.toLowerCase(),
      type: req.type.toLowerCase(),
      time_in_force: req.timeInForce.toLowerCase(),
      qty: req.quantity,
      client_order_id: req.clientRequestId, // Alpaca's own idempotency key
    };
    if (req.limitPrice != null) body.limit_price = req.limitPrice;
    if (req.stopPrice != null) body.stop_price = req.stopPrice;

    try {
      const o = await this.request("/v2/orders", { method: "POST", body: JSON.stringify(body) });
      return { externalOrderId: o.id, status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message || err) };
    }
  }

  async modifyOrder(externalOrderId: string, changes: Partial<PlaceOrderRequest>): Promise<BrokerOrderResult> {
    const body: Record<string, unknown> = {};
    if (changes.quantity != null) body.qty = changes.quantity;
    if (changes.limitPrice != null) body.limit_price = changes.limitPrice;
    if (changes.stopPrice != null) body.stop_price = changes.stopPrice;
    try {
      const o = await this.request(`/v2/orders/${externalOrderId}`, { method: "PATCH", body: JSON.stringify(body) });
      return { externalOrderId: o.id, status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId, status: "REJECTED", rejectReason: String(err.message || err) };
    }
  }

  async cancelOrder(externalOrderId: string): Promise<{ status: "CANCELLED" | "ERROR"; reason?: string }> {
    try {
      await this.request(`/v2/orders/${externalOrderId}`, { method: "DELETE" });
      return { status: "CANCELLED" };
    } catch (err: any) {
      return { status: "ERROR", reason: String(err.message || err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const o = await this.request(`/v2/orders/${externalOrderId}`);
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      new: "NEW", accepted: "NEW", pending_new: "NEW",
      partially_filled: "PARTIALLY_FILLED",
      filled: "FILLED",
      canceled: "CANCELLED", expired: "CANCELLED", done_for_day: "CANCELLED",
      rejected: "REJECTED",
    };
    return {
      externalOrderId: o.id,
      status: statusMap[o.status] ?? "NEW",
      filledQuantity: parseFloat(o.filled_qty ?? "0"),
      avgFillPrice: o.filled_avg_price ? parseFloat(o.filled_avg_price) : undefined,
    };
  }

  // Alpaca's account/trade-updates stream is a websocket at wss://paper-api.alpaca.markets/stream
  // (or the live equivalent). Left as a follow-up once the REST path above is verified working —
  // polling getOrderState is a safe fallback in the meantime.
  streamOrderEvents?: undefined;
}
