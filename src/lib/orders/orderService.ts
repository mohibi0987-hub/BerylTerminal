// The single place allowed to call broker.placeOrder(). Every path — human clicking "Buy" in
// the order ticket, or (later) an AI producing a structured trade intent — must go through
// this function, which enforces: risk validation first, full lifecycle recorded, no shortcuts.
//
//   Created -> Risk Validation -> Submitted -> Broker Accepted -> (Partially Filled ->) Filled
//   Created -> Risk Validation -> Rejected
//   Created -> Submitted -> Cancelled

import { PrismaClient, OrderStatus } from "@prisma/client";
import type { BrokerAdapter, PlaceOrderRequest } from "../brokers/types";
import type { MarketDataService } from "../market-data/types";
import { validateOrder, type RiskContext } from "../risk/engine";

export interface SubmitOrderInput {
  userId: string;
  brokerConnectionId: string;
  instrumentId: string;
  clientRequestId: string;
  request: PlaceOrderRequest;
}

export async function submitOrder(
  db: PrismaClient,
  broker: BrokerAdapter,
  marketData: MarketDataService,
  input: SubmitOrderInput
) {
  const order = await db.order.create({
    data: {
      userId: input.userId,
      brokerConnectionId: input.brokerConnectionId,
      instrumentId: input.instrumentId,
      side: input.request.side,
      type: input.request.type,
      timeInForce: input.request.timeInForce,
      quantity: input.request.quantity,
      limitPrice: input.request.limitPrice,
      stopPrice: input.request.stopPrice,
      status: OrderStatus.CREATED,
      mode: broker.mode,
      clientRequestId: input.clientRequestId,
    },
  });
  await recordTransition(db, order.id, null, OrderStatus.CREATED);

  await transition(db, order.id, OrderStatus.RISK_VALIDATION);

  const recentOrders: { clientRequestId: string }[] = await db.order.findMany({
    where: { userId: input.userId, createdAt: { gte: new Date(Date.now() - 60_000) }, id: { not: order.id } },
    select: { clientRequestId: true },
  });
  const recentIds = new Set<string>(recentOrders.map((o) => o.clientRequestId));
  const [openOrderCount, positions, account] = await Promise.all([
    db.order.count({ where: { userId: input.userId, status: { in: [OrderStatus.SUBMITTED, OrderStatus.BROKER_ACCEPTED, OrderStatus.PARTIALLY_FILLED] } } }),
    db.position.findMany({ where: { instrumentId: input.instrumentId } }) as Promise<{ quantity: number; avgPrice: number }[]>,
    broker.getAccount(),
  ]);
  const currentPositionValue = positions.reduce((sum: number, p: { quantity: number; avgPrice: number }) => sum + p.quantity * p.avgPrice, 0);

  const ctx: RiskContext = {
    broker,
    marketData,
    recentClientRequestIds: recentIds,
    userRiskLimits: { maxOrderValue: 25_000, maxPositionValue: 100_000, maxOpenOrders: 20 }, // TODO: load per-user overrides
    currentOpenOrderCount: openOrderCount,
    currentPositionValueForSymbol: currentPositionValue,
  };

  const risk = await validateOrder(input.request, ctx);
  if (!risk.passed) {
    await db.order.update({ where: { id: order.id }, data: { status: OrderStatus.REJECTED, rejectReason: risk.reason } });
    await recordTransition(db, order.id, OrderStatus.RISK_VALIDATION, OrderStatus.REJECTED, risk.reason);
    await auditLog(db, input.userId, input.brokerConnectionId, "RISK_REJECTED", { orderId: order.id, reason: risk.reason });
    return { order, status: "REJECTED" as const, reason: risk.reason };
  }

  await transition(db, order.id, OrderStatus.SUBMITTED);
  await auditLog(db, input.userId, input.brokerConnectionId, "ORDER_SUBMITTED", { orderId: order.id, request: input.request });

  const result = await broker.placeOrder(input.request);
  if (result.status === "REJECTED") {
    await db.order.update({ where: { id: order.id }, data: { status: OrderStatus.REJECTED, rejectReason: result.rejectReason } });
    await recordTransition(db, order.id, OrderStatus.SUBMITTED, OrderStatus.REJECTED, result.rejectReason);
    await auditLog(db, input.userId, input.brokerConnectionId, "BROKER_REJECTED", { orderId: order.id, reason: result.rejectReason });
    return { order, status: "REJECTED" as const, reason: result.rejectReason };
  }

  await db.order.update({ where: { id: order.id }, data: { status: OrderStatus.BROKER_ACCEPTED, externalOrderId: result.externalOrderId } });
  await recordTransition(db, order.id, OrderStatus.SUBMITTED, OrderStatus.BROKER_ACCEPTED);
  await auditLog(db, input.userId, input.brokerConnectionId, "BROKER_ACCEPTED", { orderId: order.id, externalOrderId: result.externalOrderId });

  // Poll once immediately — paper fills are usually instant; a background job should keep
  // polling (or subscribe to streamOrderEvents where the broker supports it) until terminal.
  const state = await broker.getOrderState(result.externalOrderId);
  if (state.status === "FILLED" || state.status === "PARTIALLY_FILLED") {
    const newStatus = state.status === "FILLED" ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
    await db.order.update({ where: { id: order.id }, data: { status: newStatus } });
    await recordTransition(db, order.id, OrderStatus.BROKER_ACCEPTED, newStatus);
    if (state.avgFillPrice != null) {
      await db.execution.create({
        data: { orderId: order.id, quantity: state.filledQuantity, price: state.avgFillPrice, externalExecutionId: result.externalOrderId },
      });
    }
    await auditLog(db, input.userId, input.brokerConnectionId, "ORDER_FILLED", { orderId: order.id, state });
  }

  return { order, status: state.status, externalOrderId: result.externalOrderId };
}

async function transition(db: PrismaClient, orderId: string, to: OrderStatus) {
  const current = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  await db.order.update({ where: { id: orderId }, data: { status: to } });
  await recordTransition(db, orderId, current.status, to);
}

async function recordTransition(db: PrismaClient, orderId: string, from: OrderStatus | null, to: OrderStatus, reason?: string) {
  await db.orderStateEvent.create({ data: { orderId, fromStatus: from ?? undefined, toStatus: to, reason } });
}

async function auditLog(db: PrismaClient, userId: string, brokerConnectionId: string, eventType: string, payload: unknown) {
  await db.auditEvent.create({ data: { userId, brokerConnectionId, eventType, payload: payload as any } });
}
