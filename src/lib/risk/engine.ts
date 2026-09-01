// Deterministic risk/validation layer. No AI, no LLM, and no broker call happens before this
// passes — matches the spec's explicit requirement that an AI can only ever produce a
// "structured trade intent" that still flows through this same validation, never place an
// order directly.

import type { BrokerAdapter, PlaceOrderRequest } from "../brokers/types";
import type { MarketDataService } from "../market-data/types";

export interface RiskContext {
  broker: BrokerAdapter;
  marketData: MarketDataService;
  recentClientRequestIds: Set<string>; // for duplicate-order detection
  userRiskLimits: {
    maxOrderValue: number;
    maxPositionValue: number;
    maxOpenOrders: number;
  };
  currentOpenOrderCount: number;
  currentPositionValueForSymbol: number;
}

export interface RiskResult {
  passed: boolean;
  reason?: string;
}

const STALE_QUOTE_MS = 15_000;

export async function validateOrder(req: PlaceOrderRequest, ctx: RiskContext): Promise<RiskResult> {
  // 1. Duplicate order detection (idempotency)
  if (ctx.recentClientRequestIds.has(req.clientRequestId)) {
    return { passed: false, reason: "Duplicate order — this clientRequestId was already submitted." };
  }

  // 2. Symbol sanity
  if (!req.symbol || !/^[A-Z.]{1,10}$/.test(req.symbol)) {
    return { passed: false, reason: `Invalid symbol: "${req.symbol}".` };
  }

  // 3. Quantity sanity
  if (!(req.quantity > 0)) {
    return { passed: false, reason: "Quantity must be greater than zero." };
  }

  // 4. Price sanity for limit/stop orders
  if ((req.type === "LIMIT" || req.type === "STOP_LIMIT") && !(req.limitPrice! > 0)) {
    return { passed: false, reason: "Limit orders require a positive limitPrice." };
  }
  if ((req.type === "STOP" || req.type === "STOP_LIMIT") && !(req.stopPrice! > 0)) {
    return { passed: false, reason: "Stop orders require a positive stopPrice." };
  }

  // 5. Broker connection status
  try {
    await ctx.broker.getAccount(); // cheap liveness check — throws if the session is dead
  } catch (err: any) {
    return { passed: false, reason: `Broker connection is not healthy: ${err.message ?? err}` };
  }

  // 6. Stale market data check
  let quote;
  try {
    quote = await ctx.marketData.getQuote(req.symbol);
  } catch (err: any) {
    return { passed: false, reason: `Could not fetch a live quote for ${req.symbol}: ${err.message ?? err}` };
  }
  const age = Date.now() - new Date(quote.timestamp).getTime();
  if (age > STALE_QUOTE_MS) {
    return { passed: false, reason: `Market data for ${req.symbol} is stale (${Math.round(age / 1000)}s old).` };
  }

  // 7. Buying power
  const account = await ctx.broker.getAccount();
  const estimatedPrice = req.type === "MARKET" ? quote.price : (req.limitPrice ?? quote.price);
  const estimatedCost = estimatedPrice * req.quantity;
  if (req.side === "BUY" && estimatedCost > account.buyingPower) {
    return { passed: false, reason: `Order value $${estimatedCost.toFixed(2)} exceeds buying power $${account.buyingPower.toFixed(2)}.` };
  }

  // 8. User-configured risk limits
  if (estimatedCost > ctx.userRiskLimits.maxOrderValue) {
    return { passed: false, reason: `Order value $${estimatedCost.toFixed(2)} exceeds your max order value limit $${ctx.userRiskLimits.maxOrderValue}.` };
  }
  const projectedPositionValue = ctx.currentPositionValueForSymbol + (req.side === "BUY" ? estimatedCost : -estimatedCost);
  if (req.side === "BUY" && projectedPositionValue > ctx.userRiskLimits.maxPositionValue) {
    return { passed: false, reason: `This would put your ${req.symbol} position over your max position limit $${ctx.userRiskLimits.maxPositionValue}.` };
  }
  if (ctx.currentOpenOrderCount >= ctx.userRiskLimits.maxOpenOrders) {
    return { passed: false, reason: `You already have ${ctx.currentOpenOrderCount} open orders — max is ${ctx.userRiskLimits.maxOpenOrders}.` };
  }

  return { passed: true };
}
