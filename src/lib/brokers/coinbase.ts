// Coinbase Advanced Trade adapter — uses Coinbase's current CDP (Cloud Developer Platform)
// API keys, authenticated via a short-lived JWT signed with your CDP private key (ES256 for
// ECDSA keys, EdDSA for the now-recommended Ed25519 keys) — NOT the older HMAC scheme some
// third-party guides still describe; Coinbase moved off that for Advanced Trade.
//
// Get CDP keys at portal.cdp.coinbase.com. Required credential fields:
//   apiKeyName   — full form "organizations/{org_id}/apiKeys/{key_id}"
//   apiSecret    — the private key (PEM for ECDSA, or base64 for Ed25519), exactly as downloaded

import crypto from "crypto";
import jwt from "jsonwebtoken";
import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

const HOST = "api.coinbase.com";
const BASE = `https://${HOST}`;

export class CoinbaseAdapter implements BrokerAdapter {
  readonly broker = "COINBASE" as const;
  readonly mode: ExecutionMode;
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: true, placeOrder: true,
    modifyOrder: false, cancelOrder: true, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private apiKeyName?: string;
  private apiSecret?: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    if (!credentials.apiKeyName || !credentials.apiSecret) {
      throw new Error("Coinbase requires apiKeyName (organizations/.../apiKeys/...) and apiSecret from a CDP API key (portal.cdp.coinbase.com).");
    }
    this.apiKeyName = credentials.apiKeyName;
    this.apiSecret = credentials.apiSecret;
    if (this.mode === "LIVE") await this.getAccount();
  }

  // Builds the short-lived (2 min) JWT Coinbase requires per-request. Key type (Ed25519 vs
  // ECDSA) is auto-detected from the credential format, matching Coinbase's own SDK behavior.
  // Ed25519 is signed by hand via Node's native crypto — the `jsonwebtoken` package's installed
  // version doesn't support the EdDSA algorithm at all, only ECDSA/RSA/HMAC families.
  private buildJwt(method: string, path: string): string {
    if (!this.apiKeyName || !this.apiSecret) throw new Error("Coinbase not authenticated.");
    const isEd25519 = !this.apiSecret.includes("BEGIN EC PRIVATE KEY") && !this.apiSecret.includes("BEGIN PRIVATE KEY");
    const uri = `${method} ${HOST}${path}`;
    const nonce = crypto.randomBytes(16).toString("hex");
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: this.apiKeyName, iss: "cdp", nbf: now, exp: now + 120, uri };

    if (isEd25519) {
      const privateKey = crypto.createPrivateKey({ key: Buffer.from(this.apiSecret, "base64"), format: "der", type: "pkcs8" });
      const header = { alg: "EdDSA", typ: "JWT", kid: this.apiKeyName, nonce };
      const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
      const signingInput = `${encode(header)}.${encode(payload)}`;
      const signature = crypto.sign(null, Buffer.from(signingInput), privateKey).toString("base64url");
      return `${signingInput}.${signature}`;
    }

    return jwt.sign(payload, this.apiSecret, { algorithm: "ES256", header: { kid: this.apiKeyName, nonce } as any });
  }

  private async request(method: string, path: string, body?: unknown) {
    const token = this.buildJwt(method, path);
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Coinbase ${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
    return json;
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    const json = await this.request("GET", "/api/v3/brokerage/accounts");
    const usdAccount = (json.accounts ?? []).find((a: any) => a.currency === "USD" || a.currency === "USDC");
    const cash = parseFloat(usdAccount?.available_balance?.value ?? "0");
    return { externalAccountId: usdAccount?.uuid ?? "coinbase", accountType: "spot", currency: "USD", cash, buyingPower: cash, equity: cash };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const json = await this.request("GET", "/api/v3/brokerage/accounts");
    return (json.accounts ?? [])
      .filter((a: any) => a.currency !== "USD" && a.currency !== "USDC" && parseFloat(a.available_balance?.value ?? "0") > 0)
      .map((a: any) => ({ symbol: a.currency, quantity: parseFloat(a.available_balance.value), avgPrice: 0 })); // Advanced Trade doesn't expose cost basis directly
  }

  async getQuote(symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> {
    const json = await this.request("GET", `/api/v3/brokerage/market/products/${encodeURIComponent(symbol)}/ticker`);
    const price = parseFloat(json.trades?.[0]?.price ?? json.best_bid ?? "0");
    return { symbol, price, timestamp: new Date().toISOString() };
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    try {
      const orderConfig = req.type === "MARKET"
        ? { market_market_ioc: req.side === "BUY" ? { quote_size: undefined, base_size: String(req.quantity) } : { base_size: String(req.quantity) } }
        : { limit_limit_gtc: { base_size: String(req.quantity), limit_price: String(req.limitPrice) } };
      const json = await this.request("POST", "/api/v3/brokerage/orders", {
        client_order_id: req.clientRequestId,
        product_id: req.symbol,
        side: req.side,
        order_configuration: orderConfig,
      });
      if (!json.success) return { externalOrderId: "", status: "REJECTED", rejectReason: json.error_response?.message ?? "Order rejected." };
      return { externalOrderId: json.success_response.order_id, status: "ACCEPTED" };
    } catch (err: any) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: String(err.message ?? err) };
    }
  }

  async modifyOrder(): Promise<BrokerOrderResult> {
    return { externalOrderId: "", status: "REJECTED", rejectReason: "Coinbase does not support order modification — cancel and re-place instead." };
  }

  async cancelOrder(externalOrderId: string) {
    try {
      const json = await this.request("POST", "/api/v3/brokerage/orders/batch_cancel", { order_ids: [externalOrderId] });
      const ok = json.results?.[0]?.success;
      return ok ? { status: "CANCELLED" as const } : { status: "ERROR" as const, reason: json.results?.[0]?.failure_reason };
    } catch (err: any) {
      return { status: "ERROR" as const, reason: String(err.message ?? err) };
    }
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const json = await this.request("GET", `/api/v3/brokerage/orders/historical/${externalOrderId}`);
    const o = json.order;
    const statusMap: Record<string, BrokerOrderState["status"]> = {
      OPEN: "NEW", PENDING: "NEW", FILLED: "FILLED", CANCELLED: "CANCELLED", EXPIRED: "CANCELLED", FAILED: "REJECTED",
    };
    return {
      externalOrderId,
      status: statusMap[o.status] ?? "NEW",
      filledQuantity: parseFloat(o.filled_size ?? "0"),
      avgFillPrice: o.average_filled_price ? parseFloat(o.average_filled_price) : undefined,
    };
  }
}
