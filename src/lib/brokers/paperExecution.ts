// A broker-agnostic paper adapter: same BrokerAdapter interface, fills orders against real
// market data (via the MarketDataService) instead of a real broker. This is distinct from
// "use Alpaca's own paper account" — it's for instruments/scenarios where you want simulated
// fills without needing any specific broker connected at all (e.g. a first-run demo account).
import type {
  BrokerAdapter, BrokerAccountInfo, BrokerCapabilities, BrokerCredentials,
  BrokerOrderResult, BrokerOrderState, BrokerPosition, PlaceOrderRequest,
} from "./types";
import type { MarketDataService } from "../market-data/types";

interface SimOrder extends BrokerOrderState {
  symbol: string;
}

export class PaperExecutionAdapter implements BrokerAdapter {
  readonly broker: BrokerAdapter["broker"];
  readonly mode = "PAPER" as const;
  readonly capabilities: BrokerCapabilities = {
    authentication: true, accountDiscovery: true, balances: true, buyingPower: true,
    positions: true, orders: true, executions: true, quotes: true, placeOrder: true,
    modifyOrder: true, cancelOrder: true, streamingAccountEvents: false, streamingOrderEvents: false,
  };

  private cash = 100_000;
  private positions = new Map<string, { quantity: number; avgPrice: number }>();
  private orders = new Map<string, SimOrder>();
  private nextId = 1;

  constructor(private marketData: MarketDataService, simulatedBroker: BrokerAdapter["broker"] = "ALPACA") {
    this.broker = simulatedBroker;
  }

  async authenticate(_credentials: BrokerCredentials): Promise<void> {
    // No real credentials needed — this is a local simulation.
  }

  async getAccount(): Promise<BrokerAccountInfo> {
    let marketValue = 0;
    for (const [symbol, pos] of this.positions) {
      const q = await this.marketData.getQuote(symbol).catch(() => null);
      marketValue += (q?.price ?? pos.avgPrice) * pos.quantity;
    }
    return {
      externalAccountId: "paper-sim",
      accountType: "paper",
      currency: "USD",
      cash: this.cash,
      buyingPower: this.cash,
      equity: this.cash + marketValue,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return Array.from(this.positions.entries()).map(([symbol, p]) => ({ symbol, quantity: p.quantity, avgPrice: p.avgPrice }));
  }

  async getQuote(symbol: string) {
    return this.marketData.getQuote(symbol);
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerOrderResult> {
    const quote = await this.marketData.getQuote(req.symbol);
    const fillPrice = req.type === "LIMIT" && req.limitPrice != null ? req.limitPrice : quote.price;
    const cost = fillPrice * req.quantity;

    if (req.side === "BUY" && cost > this.cash) {
      return { externalOrderId: "", status: "REJECTED", rejectReason: "Insufficient paper buying power." };
    }

    const id = `paper-${this.nextId++}`;
    if (req.side === "BUY") {
      this.cash -= cost;
      const existing = this.positions.get(req.symbol);
      if (existing) {
        const totalQty = existing.quantity + req.quantity;
        existing.avgPrice = (existing.avgPrice * existing.quantity + fillPrice * req.quantity) / totalQty;
        existing.quantity = totalQty;
      } else {
        this.positions.set(req.symbol, { quantity: req.quantity, avgPrice: fillPrice });
      }
    } else {
      const existing = this.positions.get(req.symbol);
      const sellQty = Math.min(req.quantity, existing?.quantity ?? 0);
      if (existing) {
        existing.quantity -= sellQty;
        if (existing.quantity <= 0) this.positions.delete(req.symbol);
      }
      this.cash += fillPrice * sellQty;
    }

    this.orders.set(id, { externalOrderId: id, symbol: req.symbol, status: "FILLED", filledQuantity: req.quantity, avgFillPrice: fillPrice });
    return { externalOrderId: id, status: "ACCEPTED" };
  }

  async modifyOrder(externalOrderId: string): Promise<BrokerOrderResult> {
    return { externalOrderId, status: "REJECTED", rejectReason: "Paper orders fill immediately — nothing to modify." };
  }

  async cancelOrder(externalOrderId: string) {
    const o = this.orders.get(externalOrderId);
    if (!o) return { status: "ERROR" as const, reason: "Unknown order id." };
    return { status: "ERROR" as const, reason: "Paper orders fill immediately — nothing to cancel." };
  }

  async getOrderState(externalOrderId: string): Promise<BrokerOrderState> {
    const o = this.orders.get(externalOrderId);
    if (!o) throw new Error("Unknown order id.");
    return o;
  }
}
