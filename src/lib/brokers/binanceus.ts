// Binance.US adapter — API key + secret, HMAC-SHA256 query-string signing, per Binance's
// official Spot REST auth spec (binance-docs.github.io/apidocs/spot/en, same signing scheme
// Binance.US inherits). No OAuth for trading endpoints — key-pair only, same shape as Kraken.
//
// Required env/credential fields: apiKey, apiSecret

import crypto from "crypto";
import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const BASE = "https://api.binance.us";

export class BinanceUsAdapter implements BrokerAdapter {
  readonly broker = "BINANCE_US" as const;
  readonly mode: ExecutionMode; // Binance.US has no sandbox — "PAPER" here just means "don't actually call placeOrder"
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: true, placeOrder: true,
    modifyOrder: false, cancelOrder: true, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private apiKey?: string;
  private apiSecret?: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      throw new Error("Binance.US requires apiKey and apiSecret from API Management in your Binance.US account settings.");
    }
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    if (this.mode === "LIVE") await this.getAccount(); // validate the keys actually work
  }

  private sign(params: Record<string, string>): string {
    const query = new URLSearchParams(params).toString();
    const signature = crypto.createHmac("sha256", this.apiSecret!).update(query).digest("hex");
    return `${query}&signature=${signature}`;
  }

  private async signedRequest(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, string> = {}) {
    if (!this.apiKey || !this.apiSecret) throw new Error("Binance.US not authenticated.");
    const signedQuery = this.sign({ ...params, timestamp: Date.now().toString(), recvWindow: "5000" });
    const res = await fetch(`${BASE}${path}?${signedQuery}`, {
      method,
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    const json = await res.json();
    if (json.code && json.msg) throw new Error(`Binance.US error ${json.code}: ${json.msg}`);
    return json;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const account = await this.signedRequest("GET", "/api/v3/account");
    const usd = account.balances?.find((b: any) => b.asset === "USD" || b.asset === "USDT");
    const free = parseFloat(usd?.free ?? "0");
    const locked = parseFloat(usd?.locked ?? "0");
    return {
      externalAccountId: this.apiKey!.slice(0, 8),
      accountType: "spot",
      currency: "USD",
      cash: free,
      buyingPower: free,
      equity: free + locked,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const account = await this.signedRequest("GET", "/api/v3/account");
    return (account.balances ?? [])
      .filter((b: any) => b.asset !== "USD" && b.asset !== "USDT" && parseFloat(b.free) + parseFloat(b.locked) > 0)
      .map((b: any) => ({ symbol: b.asset, quantity: parseFloat(b.free) + parseFloat(b.locked), avgPrice: 0 })); // no cost-basis on this endpoint — would need a separate trade-history query
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const res = await fetch(`${BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`);
    const json = await res.json();
    if (json.code && json.msg) throw new Error(`Binance.US error ${json.code}: ${json.msg}`);
    return { symbol, price: parseFloat(json.price), timestamp: new Date().toISOString() };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      const params: Record<string, string> = {
        symbol: req.symbol,
        side: req.side,
        type: req.type === "MARKET" ? "MARKET" : "LIMIT",
        quantity: String(req.quantity),
        newClientOrderId: req.clientRequestId,
      };
      if (req.type !== "MARKET") {
        params.timeInForce = "GTC";
        if (req.limitPrice != null) params.price = String(req.limitPrice);
      }
      const result = await this.signedRequest("POST", "/api/v3/order", params);
      return { externalOrderId: String(result.orderId), status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(): Promise<BrokerOrderResult> {
    return { externalOrderId: "", status: "REJECTED", rejectReason: "Binance.US does not support order modification — cancel and re-place instead." };
  }

  async cancelOrder(externalOrderId: string) {
    try {
      await this.signedRequest("DELETE", "/api/v3/order", { orderId: externalOrderId });
      return { status: "CANCELLED" as const };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const o = await this.signedRequest("GET", "/api/v3/order", { orderId: externalOrderId });
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      NEW: "NEW", PARTIALLY_FILLED: "PARTIALLY_FILLED", FILLED: "FILLED",
      CANCELED: "CANCELLED", EXPIRED: "CANCELLED", REJECTED: "REJECTED",
    };
    return {
      externalOrderId,
      status: statusMap[o.status] ?? "NEW",
      filledQuantity: parseFloat(o.executedQty ?? "0"),
      avgFillPrice: o.price ? parseFloat(o.price) : undefined,
    };
  }
}
