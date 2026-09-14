// Tastytrade adapter — username/password exchanged for a session token, per
// their documented REST API (api.tastytrade.com). Unlike Kraken/Binance.US/
// Gemini's HMAC-signed requests, Tastytrade's auth is a login call that
// returns a bearer token used on every subsequent request — no per-request
// signing needed.
//
// Required env/credential fields: username, password

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const BASE = "https://api.tastytrade.com";

export class TastytradeAdapter implements BrokerAdapter {
  readonly broker = "TASTYTRADE" as const;
  readonly mode: ExecutionMode; // Tastytrade has no separate sandbox in this integration — "PAPER" here just means "don't actually call placeOrder"
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: false, // quotes need a separate streaming DXLink connection, not covered here
    placeOrder: true, modifyOrder: false, cancelOrder: true,
    streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private sessionToken?: string;
  private accountNumber?: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    if (!credentials.username || !credentials.password) {
      throw new Error("Tastytrade requires your account username and password.");
    }
    const res = await fetch(`${BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: credentials.username, password: credentials.password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Tastytrade login failed: ${json.error?.message ?? res.statusText}`);
    this.sessionToken = json.data["session-token"];

    const accountsRes = await fetch(`${BASE}/customers/me/accounts`, { headers: { Authorization: this.sessionToken! } });
    const accountsJson = await accountsRes.json();
    this.accountNumber = accountsJson.data?.items?.[0]?.account?.["account-number"];
    if (!this.accountNumber) throw new Error("Tastytrade login succeeded but no account was found on this login.");
  }

  private async request(method: "GET" | "POST" | "DELETE", path: string, body?: unknown) {
    if (!this.sessionToken) throw new Error("Tastytrade not authenticated.");
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: this.sessionToken, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Tastytrade error: ${json.error?.message ?? res.statusText}`);
    return json.data;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const balances = await this.request("GET", `/accounts/${this.accountNumber}/balances`);
    return {
      externalAccountId: this.accountNumber!,
      accountType: "margin",
      currency: "USD",
      cash: parseFloat(balances["cash-balance"] ?? "0"),
      buyingPower: parseFloat(balances["derivative-buying-power"] ?? balances["equity-buying-power"] ?? "0"),
      equity: parseFloat(balances["net-liquidating-value"] ?? "0"),
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const positions = await this.request("GET", `/accounts/${this.accountNumber}/positions`);
    return (positions.items ?? []).map((p: any) => ({
      symbol: p.symbol,
      quantity: parseFloat(p.quantity) * (p["quantity-direction"] === "Short" ? -1 : 1),
      avgPrice: parseFloat(p["average-open-price"] ?? "0"),
      marketValue: p["mark-price"] ? parseFloat(p["mark-price"]) * parseFloat(p.quantity) : undefined,
    }));
  }

  async getQuote(): Promise<{ symbol: string; price: number; timestamp: string }> {
    throw new Error("Tastytrade quotes require a separate streaming (DXLink) connection — not wired up in this adapter yet.");
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      const order = {
        "order-type": req.type === "MARKET" ? "Market" : "Limit",
        "time-in-force": "Day",
        price: req.type === "LIMIT" ? String(req.limitPrice) : undefined,
        legs: [{
          "instrument-type": "Equity",
          symbol: req.symbol,
          "action": req.side === "BUY" ? "Buy to Open" : "Sell to Close",
          quantity: req.quantity,
        }],
      };
      const result = await this.request("POST", `/accounts/${this.accountNumber}/orders`, order);
      return { externalOrderId: String(result.order.id), status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(): Promise<BrokerOrderResult> {
    return { externalOrderId: "", status: "REJECTED", rejectReason: "Order modification isn't wired up for Tastytrade yet — cancel and re-place instead." };
  }

  async cancelOrder(externalOrderId: string) {
    try {
      await this.request("DELETE", `/accounts/${this.accountNumber}/orders/${externalOrderId}`);
      return { status: "CANCELLED" as const };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const order = await this.request("GET", `/accounts/${this.accountNumber}/orders/${externalOrderId}`);
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      Received: "NEW", Live: "NEW", "Partially Filled": "PARTIALLY_FILLED",
      Filled: "FILLED", Cancelled: "CANCELLED", Rejected: "REJECTED",
    };
    return {
      externalOrderId,
      status: statusMap[order.status] ?? "NEW",
      filledQuantity: parseFloat(order["size"] ?? "0") - parseFloat(order["remaining-quantity"] ?? "0"),
      avgFillPrice: order.price ? parseFloat(order.price) : undefined,
    };
  }
}
