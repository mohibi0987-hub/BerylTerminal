import { db } from "../db";
import { decryptSecret } from "../crypto";
import { AlpacaAdapter } from "./alpaca";
import { WebullAdapter } from "./webull";
import { IbkrAdapter } from "./ibkr";
import { KrakenAdapter } from "./kraken";
import { CoinbaseAdapter } from "./coinbase";
import { TradovateAdapter } from "./tradovate";
import { getEphemeralCredentials } from "../auth";
import type { BrokerAdapter, BrokerName, ExecutionMode } from "./types";

function buildAdapter(broker: BrokerName, mode: ExecutionMode): BrokerAdapter {
  switch (broker) {
    case "ALPACA": return new AlpacaAdapter(mode);
    case "WEBULL": return new WebullAdapter(mode);
    case "IBKR": return new IbkrAdapter(mode);
    case "KRAKEN": return new KrakenAdapter(mode);
    case "COINBASE": return new CoinbaseAdapter(mode);
    case "TRADOVATE": return new TradovateAdapter(mode);
    default: throw new Error(`Unknown broker: ${broker}`);
  }
}

// Loads a user's credentials for a broker connection — checking the ephemeral (session-only,
// "don't remember me") store first, then falling back to the persisted, encrypted database
// row — decrypts them, authenticates a fresh adapter instance, and returns it ready to use.
export async function getBrokerAdapter(userId: string, broker: BrokerName, mode: ExecutionMode): Promise<BrokerAdapter> {
  const adapter = buildAdapter(broker, mode);

  const ephemeral = await getEphemeralCredentials(broker, mode);
  if (ephemeral) {
    await adapter.authenticate(ephemeral);
    return adapter;
  }

  const conn = await db.brokerConnection.findUnique({
    where: { userId_broker_mode: { userId, broker, mode } },
  });
  if (!conn || !conn.encryptedCredentials) {
    throw new Error(`${broker} (${mode}) is not connected for this user.`);
  }
  const credentials = JSON.parse(decryptSecret(conn.encryptedCredentials));
  await adapter.authenticate(credentials);
  return adapter;
}
