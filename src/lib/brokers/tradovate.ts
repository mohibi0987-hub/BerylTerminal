// Tradovate adapter — no redirect login, no simple API key either: Tradovate exchanges your
// actual username/password (plus an API app id/secret you generate in Settings → API Access)
// directly for a short-lived Bearer token via POST /auth/accessTokenRequest. This is why it's
// an in-app username/password form rather than a "Connect" redirect.
//
// Required credential fields: username, password, cid (client id), sec (client secret)
// appId/appVersion/deviceId are fixed identifiers for this app, not per-user.

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const DEMO_BASE = "https://demo.tradovateapi.com/v1";
const LIVE_BASE = "https://live.tradovateapi.com/v1";
const APP_ID = "BerylTerminal";
const APP_VERSION = "1.0";

export class TradovateAdapter implements BrokerAdapter {
  readonly broker = "TRADOVATE" as const;
  readonly mode: ExecutionMode;
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: true, placeOrder: true,
    modifyOrder: true, cancelOrder: true, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private baseUrl: string;
  private accessToken?: string;
  private accountId?: number;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
    this.baseUrl = mode === "LIVE" ? LIVE_BASE : DEMO_BASE;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    const { username, password, cid, sec } = credentials;
    if (!username || !password || !cid || !sec) {
      throw new Error("Tradovate requires username, password, cid, and sec (from Settings → API Access in your Tradovate account).");
    }
    const res = await fetch(`${this.baseUrl}/auth/accessTokenRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, password, appId: APP_ID, appVersion: APP_VERSION, cid, sec, deviceId: "berylterminal-server" }),
    });
    const json = await res.json();
    if (!res.ok || !json.accessToken) {
      throw new Error(json.errorText ?? "Tradovate rejected these credentials.");
    }
    this.accessToken = json.accessToken;
    const accounts = await this.request("GET", "/account/list");
    this.accountId = accounts[0]?.id;
  }

  private async request(method: string, path: string, body?: unknown) {
    if (!this.accessToken) throw new Error("Tradovate not authenticated.");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Tradovate ${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
    return json;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const balances = await this.request("GET", `/cashBalance/getCashBalanceSnapshot`).catch(() => null);
    const cash = balances?.cashBalance ?? 0;
    return { externalAccountId: String(this.accountId ?? "tradovate"), accountType: mode(this.mode), currency: "USD", cash, buyingPower: cash, equity: cash };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const positions = await this.request("GET", "/position/list");
    return (positions ?? [])
      .filter((p: any) => p.netPos !== 0)
      .map((p: any) => ({ symbol: String(p.contractId), quantity: p.netPos, avgPrice: p.netPrice ?? 0 }));
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const json = await this.request("GET", `/md/getQuote?symbol=${encodeURIComponent(symbol)}`);
    return { symbol, price: json.last ?? json.price ?? 0, timestamp: new Date().toISOString() };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      const json = await this.request("POST", "/order/placeOrder", {
        accountId: this.accountId,
        symbol: req.symbol,
        action: req.side === "BUY" ? "Buy" : "Sell",
        orderQty: req.quantity,
        orderType: req.type === "MARKET" ? "Market" : "Limit",
        price: req.limitPrice,
        timeInForce: req.timeInForce === "GTC" ? "GTC" : "Day",
      });
      if (json.failureReason) return { externalOrderId: "", status: "REJECTED", rejectReason: json.failureReason };
      return { externalOrderId: String(json.orderId), status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(externalOrderId: string, changes: Partial<PlaceOrderRequest>): Promise<BrokerOrderResult> {
    try {
      await this.request("POST", "/order/modifyOrder", { orderId: Number(externalOrderId), orderQty: changes.quantity, price: changes.limitPrice });
      return { externalOrderId, status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId, status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async cancelOrder(externalOrderId: string) {
    try {
      await this.request("POST", "/order/cancelOrder", { orderId: Number(externalOrderId) });
      return { status: "CANCELLED" as const };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const json = await this.request("GET", `/order/find?id=${externalOrderId}`);
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      Working: "NEW", Filled: "FILLED", Canceled: "CANCELLED", Rejected: "REJECTED",
    };
    return { externalOrderId, status: statusMap[json.ordStatus] ?? "NEW", filledQuantity: json.filledQty ?? 0, avgFillPrice: json.avgPrice };
  }
}

function mode(m: ExecutionMode) { return m === "LIVE" ? "live" : "demo"; }
