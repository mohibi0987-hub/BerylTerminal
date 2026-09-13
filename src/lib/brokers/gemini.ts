// Gemini adapter — API key + secret, HMAC-SHA384 over a base64 JSON payload, per Gemini's
// official REST auth spec (docs.gemini.com/rest-api/#private-api-invocation). No OAuth for
// trading endpoints — key-pair only, same shape as Kraken/Binance.US.
//
// Required env/credential fields: apiKey, apiSecret
//
// Note on order types: Gemini's classic order endpoint has no native "market" order type.
// A MARKET request here is emulated as an aggressive immediate-or-cancel limit order priced
// through the current spread (past the best ask when buying, past the best bid when
// selling) — a standard, documented technique for market-order emulation on venues that
// don't offer one natively. It is NOT the same guarantee as a true market order elsewhere;
// in a fast-moving market it can partially fill or miss if price moves past the aggressive
// limit before it executes.

import crypto from "crypto";
import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const BASE = "https://api.gemini.com";
const MARKET_ORDER_SLIPPAGE_PCT = 0.02; // 2% through the spread, to emulate a market order via IOC limit

export class GeminiAdapter implements BrokerAdapter {
  readonly broker = "GEMINI" as const;
  readonly mode: ExecutionMode; // Gemini has no separate sandbox in this integration — "PAPER" here just means "don't actually call placeOrder"
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
      throw new Error("Gemini requires apiKey and apiSecret from Account → Settings → API in your Gemini dashboard.");
    }
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    if (this.mode === "LIVE") await this.getAccount(); // validate the keys actually work
  }

  private async privateRequest(path: string, params: Record<string, unknown> = {}) {
    if (!this.apiKey || !this.apiSecret) throw new Error("Gemini not authenticated.");
    const payload = { request: path, nonce: Date.now().toString(), ...params };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = crypto.createHmac("sha384", this.apiSecret).update(payloadB64).digest("hex");
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-GEMINI-APIKEY": this.apiKey,
        "X-GEMINI-PAYLOAD": payloadB64,
        "X-GEMINI-SIGNATURE": signature,
        "Cache-Control": "no-cache",
      },
    });
    const json = await res.json();
    if (json.result === "error") throw new Error(`Gemini error: ${json.reason} — ${json.message}`);
    return json;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const balances = await this.privateRequest("/v1/balances");
    const usd = balances.find((b: any) => b.currency === "USD");
    const available = parseFloat(usd?.available ?? "0");
    const amount = parseFloat(usd?.amount ?? "0");
    return { externalAccountId: this.apiKey!.slice(0, 8), accountType: "spot", currency: "USD", cash: available, buyingPower: available, equity: amount };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const balances = await this.privateRequest("/v1/balances");
    return balances
      .filter((b: any) => b.currency !== "USD" && parseFloat(b.amount) > 0)
      .map((b: any) => ({ symbol: b.currency, quantity: parseFloat(b.amount), avgPrice: 0 })); // Gemini's balances endpoint has no cost-basis — would need a separate trade-history query
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const res = await fetch(`${BASE}/v1/pubticker/${encodeURIComponent(symbol.toLowerCase())}`);
    const json = await res.json();
    if (json.result === "error") throw new Error(`Gemini error: ${json.reason} — ${json.message}`);
    return { symbol, price: parseFloat(json.last), timestamp: new Date().toISOString() };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      let price = req.limitPrice;
      const options: string[] = [];
      if (req.type === "MARKET") {
        const quote = await this.getQuote(req.symbol);
        price = req.side === "BUY" ? quote.price * (1 + MARKET_ORDER_SLIPPAGE_PCT) : quote.price * (1 - MARKET_ORDER_SLIPPAGE_PCT);
        options.push("immediate-or-cancel");
      }
      if (price == null) throw new Error("A price is required (limit price, or a quote to emulate a market order).");

      const result = await this.privateRequest("/v1/order/new", {
        client_order_id: req.clientRequestId,
        symbol: req.symbol.toLowerCase(),
        amount: String(req.quantity),
        price: price.toFixed(2),
        side: req.side.toLowerCase(),
        type: "exchange limit",
        options,
      });
      return { externalOrderId: String(result.order_id), status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(): Promise<BrokerOrderResult> {
    return { externalOrderId: "", status: "REJECTED", rejectReason: "Gemini does not support order modification — cancel and re-place instead." };
  }

  async cancelOrder(externalOrderId: string) {
    try {
      await this.privateRequest("/v1/order/cancel", { order_id: Number(externalOrderId) });
      return { status: "CANCELLED" as const };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const o = await this.privateRequest("/v1/order/status", { order_id: Number(externalOrderId) });
    let status: BrokerOrderState["status"] = "NEW";
    if (o.is_cancelled) status = "CANCELLED";
    else if (!o.is_live && parseFloat(o.executed_amount) > 0) status = "FILLED";
    else if (parseFloat(o.executed_amount) > 0) status = "PARTIALLY_FILLED";
    return {
      externalOrderId,
      status,
      filledQuantity: parseFloat(o.executed_amount ?? "0"),
      avgFillPrice: o.avg_execution_price ? parseFloat(o.avg_execution_price) : undefined,
    };
  }
}
