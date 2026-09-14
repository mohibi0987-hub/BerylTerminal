// TradeStation adapter — honest scaffolding, not a working integration yet.
//
// TradeStation's real API (api.tradestation.com) requires full OAuth2
// authorization-code flow: the user is redirected to TradeStation to log in
// and approve access, then TradeStation redirects back with a code your
// server exchanges for an access token + refresh token. That's a
// fundamentally different shape than every other adapter in this file,
// which authenticates with a static key/secret pair pasted once into
// BrokerConnectModal — there's no way to "paste a password" your way into
// TradeStation's flow, by design (that's their security model, not a gap).
//
// Wiring this up for real needs: registering an app in TradeStation's
// developer portal, a new `/api/broker/oauth/tradestation/start` and
// `/callback` route pair, and storing the resulting access+refresh tokens
// instead of a static credential blob. None of that exists yet — this class
// exists so the type system and registry are ready for it, not because any
// part of it actually talks to TradeStation today.

import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, ExecutionMode, PlaceOrderRequest,
} from "./types";

export class TradeStationAdapter implements BrokerAdapter {
  readonly broker = "TRADESTATION" as const;
  readonly mode: ExecutionMode;
  readonly capabilities: BrokerCapabilities = {
    authentication: false, accountDiscovery: false, balances: false, buyingPower: false,
    positions: false, orders: false, executions: false, quotes: false, placeOrder: false,
    modifyOrder: false, cancelOrder: false, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  constructor(mode: ExecutionMode) {
    this.mode = mode;
  }

  async authenticate(_credentials: BrokerCredentials): Promise<void> {
    throw new Error("TradeStation requires an OAuth2 login flow, not a pasted key/secret — this isn't wired up yet. See the comment at the top of this file.");
  }

  async getAccount(): Promise<BrokerAccountInfo> { throw new Error("TradeStation isn't connected yet."); }
  async getPositions(): Promise<BrokerPosition[]> { throw new Error("TradeStation isn't connected yet."); }
  async getQuote(): Promise<{ symbol: string; price: number; timestamp: string }> { throw new Error("TradeStation isn't connected yet."); }
  async placeOrder(): Promise<BrokerOrderResult> { return { externalOrderId: "", status: "REJECTED", rejectReason: "TradeStation isn't connected yet." }; }
  async modifyOrder(): Promise<BrokerOrderResult> { return { externalOrderId: "", status: "REJECTED", rejectReason: "TradeStation isn't connected yet." }; }
  async cancelOrder() { return { status: "ERROR" as const, reason: "TradeStation isn't connected yet." }; }
  async getOrderState(): Promise<BrokerOrderState> { throw new Error("TradeStation isn't connected yet."); }
}
