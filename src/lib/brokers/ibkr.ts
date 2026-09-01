// Interactive Brokers adapter — implements BrokerAdapter against IBKR's Client Portal Web API.
//
// IBKR is the heaviest of the three to stand up: their Client Portal Gateway is a Java
// process that must be running (locally, or on a server you control) and holds the actual
// authenticated brokerage session — this Node backend calls that gateway's local REST API
// (default https://localhost:5000/v1/api/...), it does not call Interactive Brokers directly.
// You'll also need a funded/paper IBKR account and to complete their gateway login (including
// 2FA) before this adapter can do anything.
//
// Required env vars once you have a gateway running:
//   IBKR_GATEWAY_URL   (e.g. https://localhost:5000/v1/api — or wherever you host the gateway)
//   IBKR_ACCOUNT_ID

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

export class IbkrAdapter implements BrokerAdapter {
  readonly broker = "IBKR" as const;
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
    streamingAccountEvents: false, // IBKR supports this via their websocket — not wired yet
    streamingOrderEvents: false,
  };

  private gatewayUrl?: string;
  private accountId?: string;

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(credentials: BrokerCredentials): Promise<void> {
    const gatewayUrl = credentials.gatewayUrl;
    const accountId = credentials.accountId;
    if (!gatewayUrl || !accountId) {
      throw new Error(
        "IBKR requires gatewayUrl (your running Client Portal Gateway) and accountId. " +
        "The gateway itself must already be logged in — this adapter cannot complete IBKR's " +
        "own login/2FA flow on your behalf."
      );
    }
    this.gatewayUrl = gatewayUrl;
    this.accountId = accountId;
    await this.getAccount();
  }

  private notReady(): never {
    throw new Error(
      "IbkrAdapter is scaffolded but not wired to a live gateway session yet. " +
      "Start the Client Portal Gateway, log in through it, set IBKR_GATEWAY_URL/IBKR_ACCOUNT_ID, " +
      "then fill in the endpoint calls below against your gateway's /v1/api docs."
    );
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    if (!this.gatewayUrl || !this.accountId) throw new Error("IBKR not authenticated.");
    return this.notReady();
  }
  async getPositions(): Promise<BrokerPosition[]> { return this.notReady(); }
  async getQuote(_symbol: string): Promise<{ symbol: string; price: number; timestamp: string }> { return this.notReady(); }
  async placeOrder(_req: PlaceOrderRequest): Promise<BrokerOrderResult> { return this.notReady(); }
  async modifyOrder(_id: string, _changes: Partial<PlaceOrderRequest>): Promise<BrokerOrderResult> { return this.notReady(); }
  async cancelOrder(_id: string): Promise<{ status: "CANCELLED" | "ERROR"; reason?: string }> { return this.notReady(); }
  async getOrderState(_id: string): Promise<BrokerOrderState> { return this.notReady(); }
}
