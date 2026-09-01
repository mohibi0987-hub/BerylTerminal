import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getBrokerAdapter } from "@/lib/brokers/registry";
import { TwelveDataService } from "@/lib/market-data/twelvedata";
import { submitOrder } from "@/lib/orders/orderService";
import type { BrokerName, ExecutionMode, PlaceOrderRequest } from "@/lib/brokers/types";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { instrument: true, executions: true },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const broker = body.broker as BrokerName;
  const mode = (body.mode ?? "PAPER") as ExecutionMode;

  const instrument = await db.instrument.upsert({
    where: { symbol: body.symbol },
    create: { symbol: body.symbol, assetClass: body.assetClass ?? "equity" },
    update: {},
  });

  const conn = await db.brokerConnection.findUnique({ where: { userId_broker_mode: { userId, broker, mode } } });
  if (!conn) return NextResponse.json({ error: `${broker} (${mode}) is not connected. Connect it first.` }, { status: 400 });

  let adapter;
  try {
    adapter = await getBrokerAdapter(userId, broker, mode);
  } catch (err: any) {
    return NextResponse.json({ error: `Broker connection failed: ${err.message ?? err}` }, { status: 400 });
  }

  const marketData = new TwelveDataService();

  const request: PlaceOrderRequest = {
    clientRequestId: crypto.randomUUID(),
    symbol: body.symbol,
    side: body.side,
    type: body.type,
    timeInForce: body.timeInForce ?? "DAY",
    quantity: body.quantity,
    limitPrice: body.limitPrice,
    stopPrice: body.stopPrice,
  };

  const result = await submitOrder(db, adapter, marketData, {
    userId,
    brokerConnectionId: conn.id,
    instrumentId: instrument.id,
    clientRequestId: request.clientRequestId,
    request,
  });

  return NextResponse.json(result);
}
