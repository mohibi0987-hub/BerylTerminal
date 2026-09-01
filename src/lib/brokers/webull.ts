// Webull adapter — implements BrokerAdapter against Webull's OpenAPI.
//
// IMPORTANT — this one is honest-scaffolding, not a verified-working integration yet:
// Webull's OpenAPI (developer.webull.com) requires applying for access and waiting for
// approval (their docs list a 1-2 business day review) before you get real App Key /
// App Secret credentials. Their public docs confirm: HTTP for standard requests, gRPC for
// real-time order notifications, MQTT for real-time market data, and request signing with
// your App Key/Secret — but the exact endpoint paths and signature format are only fully
// visible once your application is approved and you can read the full docs/SDK.
//
// Once approved: grab the official Webull SDK (Python/Java are officially supported; for
// a Node/TypeScript backend you'll likely be calling their signed HTTP endpoints directly,
// mirroring what the SDK does) and fill in `sign()` and the endpoint paths below to match
// exactly what the docs specify. Everything else in this file — the BrokerAdapter contract,
// how it plugs into the risk engine and order service — does not change.
//
// Required env vars once you have them:
//   WEBULL_APP_KEY
//   WEBULL_APP_SECRET
//   WEBULL_REGION  (e.g. "us")

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

export class WebullAdapter implements BrokerAdapter {
  readonly broker = "WEBULL" as const;
  readonly mode: ExecutionMode;
  readonly capabilities: BrokerCapabilities = {
    authentication: true,
    accountDiscovery: true,
    balances: true,
    buyingPower: true,
    positions: true,
    orders: true,
    executions: true,
    quotes: true, // Webull's OpenAPI advertises free Level 1 streaming quotes for US stocks
    placeOrder: true,
    modifyOrder: true,
    cancelOrder: true,
    streamingAccountEvents: false, // needs their gRPC order-notification stream — not wired yet
    streamingOrderEvents: false,
  };

  private appKey?: string;
  private appSecret?: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
    if (mode === "LIVE") {
      // Per Webull's docs, live trading also requires going through their OAuth "Connect API"
      // so a user can authorize this app against their real account — separate from the
      // App Key/Secret used for market data and the test environment.
    }
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    const appKey = credentials.appKey;
    const appSecret = credentials.appSecret;
    if (!appKey || !appSecret) {
      throw new Error(
        "Webull requires appKey and appSecret from an approved OpenAPI application " +
        "(apply at developer.webull.com — approval typically takes 1-2 business days)."
      );
    }
    this.appKey = appKey;
    this.appSecret = appSecret;
    await this.getAccount();
  }

  // Placeholder signer — Webull's docs describe request signing with the App Secret but the
  // exact algorithm (which headers, canonicalization order, timestamp format) needs to be
  // copied from the approved docs/SDK rather than guessed here.
  private sign(_method: string, _path: string, _body: string, _timestamp: number): string {
    throw new Error(
      "WebullAdapter.sign() is not implemented yet — copy the exact signing steps from " +
      "developer.webull.com once your application is approved, then this adapter is otherwise complete."
    );
  }

  private notReady(): never {
    throw new Error(
      "WebullAdapter is scaffolded but not wired to real endpoints yet. " +
      "Set WEBULL_APP_KEY/WEBULL_APP_SECRET and fill in sign() + the endpoint paths from the approved docs."
    );
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    if (!this.appKey || !this.appSecret) throw new Error("Webull not authenticated.");
    return this.notReady();
  }
  async getPositions(): Promise<BrokerPosition[]> { return this.notReady(); }
  async getQuote(_symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> { return this.notReady(); }
  async placeOrder(_req: PlaceOrderRequest): Promise<BrokerOrderResult> { return this.notReady(); }
  async modifyOrder(_id: string, _changes: Partial<PlaceOrderRequest>): Promise<BrokerOrderResult> { return this.notReady(); }
  async cancelOrder(_id: string): Promise<{ status: "CANCELLED" | "ERROR"; reason?: string }> { return this.notReady(); }
  async getOrderState(_id: string): Promise<BrokerOrderState> { return this.notReady(); }
}
