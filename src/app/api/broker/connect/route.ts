import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getCurrentUserId, getRawEphemeralCookie, buildEphemeralCookie } from "@/lib/auth";
import type { BrokerName, ExecutionMode } from "@/lib/brokers/types";
import { AlpacaAdapter } from "@/lib/brokers/alpaca";
import { WebullAdapter } from "@/lib/brokers/webull";
import { IbkrAdapter } from "@/lib/brokers/ibkr";
import { KrakenAdapter } from "@/lib/brokers/kraken";
import { CoinbaseAdapter } from "@/lib/brokers/coinbase";
import { TradovateAdapter } from "@/lib/brokers/tradovate";

// Required credential fields per broker — used only to build the adapter and to validate
// the request body; the credentials themselves are stored as one generic encrypted blob,
// so adding a broker with a different credential shape never requires a schema change.
const REQUIRED_FIELDS: Record<BrokerName, string[]> = {
  ALPACA: ["apiKeyId", "apiSecretKey"],
  WEBULL: ["appKey", "appSecret"],
  IBKR: ["gatewayUrl", "accountId"],
  KRAKEN: ["apiKey", "apiSecret"],
  COINBASE: ["apiKeyName", "apiSecret"],
  TRADOVATE: ["username", "password", "cid", "sec"],
};

function buildAdapter(broker: BrokerName, mode: ExecutionMode) {
  switch (broker) {
    case "ALPACA": return new AlpacaAdapter(mode);
    case "WEBULL": return new WebullAdapter(mode);
    case "IBKR": return new IbkrAdapter(mode);
    case "KRAKEN": return new KrakenAdapter(mode);
    case "COINBASE": return new CoinbaseAdapter(mode);
    case "TRADOVATE": return new TradovateAdapter(mode);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const broker = body.broker as BrokerName;
  const mode = (body.mode ?? "PAPER") as ExecutionMode;
  const remember = body.remember !== false; // default true

  const required = REQUIRED_FIELDS[broker];
  if (!required) return NextResponse.json({ error: `Unknown broker: ${broker}` }, { status: 400 });

  const credentials: Record<string, string> = {};
  for (const field of required) {
    if (!body[field]) return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    credentials[field] = body[field];
  }

  const adapter = buildAdapter(broker, mode);

  try {
    await adapter.authenticate(credentials); // real validation call against the broker (or gateway)
  } catch (err: any) {
    if (remember) {
      await db.brokerConnection.upsert({
        where: { userId_broker_mode: { userId, broker, mode } },
        create: { userId, broker, mode, status: "ERROR", lastError: String(err.message ?? err) },
        update: { status: "ERROR", lastError: String(err.message ?? err) },
      });
    }
    return NextResponse.json({ error: `Could not connect: ${err.message ?? err}` }, { status: 400 });
  }

  const account = await adapter.getAccount();
  const encryptedBlob = encryptSecret(JSON.stringify(credentials));

  // Always keep a connection record for bookkeeping/audit and so orders have something to
  // reference — but only persist the actual secret here when the user chose to be remembered.
  const conn = await db.brokerConnection.upsert({
    where: { userId_broker_mode: { userId, broker, mode } },
    create: { userId, broker, mode, status: "CONNECTED", encryptedCredentials: remember ? encryptedBlob : null, externalAccountId: account.externalAccountId, lastConnectedAt: new Date() },
    update: { status: "CONNECTED", encryptedCredentials: remember ? encryptedBlob : null, externalAccountId: account.externalAccountId, lastConnectedAt: new Date(), lastError: null },
  });

  if (!remember) {
    // Session-only: the actual secret lives inside its own dedicated cookie, never the database.
    const cookie = buildEphemeralCookie(getRawEphemeralCookie(), broker, mode, credentials);
    const res = NextResponse.json({ connected: true, broker, mode, account, remembered: false });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  return NextResponse.json({ connected: true, broker, mode, account, remembered: true, connectionId: conn.id });
}
