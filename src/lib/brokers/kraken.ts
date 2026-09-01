// Kraken adapter — API key + private key with HMAC-SHA512 signing, per Kraken's official
// Spot REST auth spec (docs.kraken.com/api/docs/guides/spot-rest-auth). No OAuth exists for
// Kraken's trading API at all — this key-pair flow is the only way in, same shape as Alpaca.
//
// Required env/credential fields: apiKey (public), apiSecret (private, base64-encoded)

import crypto from "crypto";
import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const BASE = "https://api.kraken.com";

export class KrakenAdapter implements BrokerAdapter {
  readonly broker = "KRAKEN" as const;
  readonly mode: ExecutionMode; // Kraken has no separate sandbox — "PAPER" here just means "don't actually call placeOrder"
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: true, placeOrder: true,
    modifyOrder: false, cancelOrder: true, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private apiKey?: string;
  private apiSecret?: string; // base64-encoded, as Kraken issues it

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      throw new Error("Kraken requires apiKey and apiSecret from Account → Security → API in your Kraken dashboard.");
    }
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    if (this.mode === "LIVE") await this.getAccount(); // validate the keys actually work
  }

  private sign(path: string, nonce: string, postData: string): string {
    const secretBuf = Buffer.from(this.apiSecret!, "base64");
    const sha256 = crypto.createHash("sha256").update(nonce + postData).digest();
    const hmac = crypto.createHmac("sha512", secretBuf).update(Buffer.concat([Buffer.from(path), sha256])).digest("base64");
    return hmac;
  }

  private async privateRequest(path: string, params: Record<string, string> = {}) {
    if (!this.apiKey || !this.apiSecret) throw new Error("Kraken not authenticated.");
    const nonce = Date.now().toString();
    const body = new URLSearchParams({ nonce, ...params }).toString();
    const signature = this.sign(path, nonce, body);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "API-Key": this.apiKey, "API-Sign": signature, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json();
    if (json.error?.length) throw new Error(`Kraken error: ${json.error.join(", ")}`);
    return json.result;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const balances = await this.privateRequest("/0/private/Balance");
    const usd = parseFloat(balances.ZUSD ?? balances.USD ?? "0");
    // TradeBalance gives equity/margin-aware figures; fall back to raw balance if unavailable.
    let equity = usd;
    try {
      const tb = await this.privateRequest("/0/private/TradeBalance", { asset: "ZUSD" });
      equity = parseFloat(tb.eb ?? usd);
    } catch { /* not all account types support margin endpoints — ignore */ }
    return { externalAccountId: this.apiKey!.slice(0, 8), accountType: "spot", currency: "USD", cash: usd, buyingPower: usd, equity };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const balances = await this.privateRequest("/0/private/Balance");
    return Object.entries(balances)
      .filter(([asset, qty]) => asset !== "ZUSD" && asset !== "USD" && parseFloat(qty as string) > 0)
      .map(([asset, qty]) => ({ symbol: asset, quantity: parseFloat(qty as string), avgPrice: 0 })); // Kraken's Balance endpoint has no cost-basis; would need a separate ledger query
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const res = await fetch(`${BASE}/0/public/Ticker?pair=${encodeURIComponent(symbol)}`);
    const json = await res.json();
    if (json.error?.length) throw new Error(`Kraken error: ${json.error.join(", ")}`);
    const pairKey = Object.keys(json.result)[0];
    return { symbol, price: parseFloat(json.result[pairKey].c[0]), timestamp: new Date().toISOString() };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      const result = await this.privateRequest("/0/private/AddOrder", {
        pair: req.symbol,
        type: req.side.toLowerCase(),
        ordertype: req.type.toLowerCase() === "market" ? "market" : "limit",
        volume: String(req.quantity),
        ...(req.limitPrice != null ? { price: String(req.limitPrice) } : {}),
        userref: req.clientRequestId.replace(/[^0-9]/g, "").slice(0, 9) || "0", // Kraken userref must be numeric
      });
      return { externalOrderId: result.txid[0], status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(): Promise<BrokerOrderResult> {
    return { externalOrderId: "", status: "REJECTED", rejectReason: "Kraken does not support order modification — cancel and re-place instead." };
  }

  async cancelOrder(externalOrderId: string) {
    try {
      await this.privateRequest("/0/private/CancelOrder", { txid: externalOrderId });
      return { status: "CANCELLED" as const };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const result = await this.privateRequest("/0/private/QueryOrders", { txid: externalOrderId });
    const o = result[externalOrderId];
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      pending: "NEW", open: "NEW", closed: "FILLED", canceled: "CANCELLED", expired: "CANCELLED",
    };
    return {
      externalOrderId,
      status: statusMap[o.status] ?? "NEW",
      filledQuantity: parseFloat(o.vol_exec ?? "0"),
      avgFillPrice: o.price ? parseFloat(o.price) : undefined,
    };
  }
}
