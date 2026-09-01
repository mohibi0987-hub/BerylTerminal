import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getCurrentUserId } from "@/lib/auth";
import type { BrokerName, ExecutionMode } from "@/lib/brokers/types";
import { AlpacaAdapter } from "@/lib/brokers/alpaca";
import { WebullAdapter } from "@/lib/brokers/webull";
import { IbkrAdapter } from "@/lib/brokers/ibkr";

// Body shape depends on broker:
//   ALPACA: { broker: "ALPACA", mode, apiKeyId, apiSecretKey }
//   WEBULL: { broker: "WEBULL", mode, appKey, appSecret }
//   IBKR:   { broker: "IBKR",   mode, gatewayUrl, accountId }
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const broker = body.broker as BrokerName;
  const mode = (body.mode ?? "PAPER") as ExecutionMode;

  let adapter;
  let keyField: string, secretField: string, credentials: Record<string, string>;
  if (broker === "ALPACA") {
    adapter = new AlpacaAdapter(mode);
    keyField = body.apiKeyId; secretField = body.apiSecretKey;
    credentials = { apiKeyId: body.apiKeyId, apiSecretKey: body.apiSecretKey };
  } else if (broker === "WEBULL") {
    adapter = new WebullAdapter(mode);
    keyField = body.appKey; secretField = body.appSecret;
    credentials = { appKey: body.appKey, appSecret: body.appSecret };
  } else if (broker === "IBKR") {
    adapter = new IbkrAdapter(mode);
    keyField = body.gatewayUrl; secretField = body.accountId;
    credentials = { gatewayUrl: body.gatewayUrl, accountId: body.accountId };
  } else {
    return NextResponse.json({ error: `Unknown broker: ${broker}` }, { status: 400 });
  }

  if (!keyField || !secretField) {
    return NextResponse.json({ error: "Missing credentials for this broker." }, { status: 400 });
  }

  try {
    await adapter.authenticate(credentials); // real validation call against the broker/gateway
  } catch (err: any) {
    await db.brokerConnection.upsert({
      where: { userId_broker_mode: { userId, broker, mode } },
      create: { userId, broker, mode, status: "ERROR", lastError: String(err.message ?? err) },
      update: { status: "ERROR", lastError: String(err.message ?? err) },
    });
    return NextResponse.json({ error: `Could not connect: ${err.message ?? err}` }, { status: 400 });
  }

  const account = await adapter.getAccount();
  await db.brokerConnection.upsert({
    where: { userId_broker_mode: { userId, broker, mode } },
    create: {
      userId, broker, mode, status: "CONNECTED",
      encryptedApiKey: encryptSecret(keyField),
      encryptedApiSecret: encryptSecret(secretField),
      externalAccountId: account.externalAccountId,
      lastConnectedAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      encryptedApiKey: encryptSecret(keyField),
      encryptedApiSecret: encryptSecret(secretField),
      externalAccountId: account.externalAccountId,
      lastConnectedAt: new Date(),
      lastError: null,
    },
  });

  return NextResponse.json({ connected: true, broker, mode, account });
}
