import { db } from "../db";
import { decryptSecret } from "../crypto";
import { AlpacaAdapter } from "./alpaca";
import { WebullAdapter } from "./webull";
import { IbkrAdapter } from "./ibkr";
import type { BrokerAdapter, BrokerName, ExecutionMode } from "./types";

function buildAdapter(broker: BrokerName, mode: ExecutionMode): BrokerAdapter {
  switch (broker) {
    case "ALPACA": return new AlpacaAdapter(mode);
    case "WEBULL": return new WebullAdapter(mode);
    case "IBKR": return new IbkrAdapter(mode);
    default: throw new Error(`Unknown broker: ${broker}`);
  }
}

// Loads a user's stored (encrypted) credentials for a broker connection, decrypts them,
// authenticates a fresh adapter instance, and returns it ready to use. Adapters are stateless
// enough to build per-request — no shared mutable session state leaks between users.
export async function getBrokerAdapter(userId: string, broker: BrokerName, mode: ExecutionMode): Promise<BrokerAdapter> {
  const conn = await db.brokerConnection.findUnique({
    where: { userId_broker_mode: { userId, broker, mode } },
  });
  if (!conn || !conn.encryptedApiKey) {
    throw new Error(`${broker} (${mode}) is not connected for this user.`);
  }

  const adapter = buildAdapter(broker, mode);
  const apiKey = decryptSecret(conn.encryptedApiKey);
  const apiSecret = conn.encryptedApiSecret ? decryptSecret(conn.encryptedApiSecret) : undefined;

  // Credential field names differ per broker — map them here rather than leaking
  // broker-specific naming into the rest of the app.
  const credentials =
    broker === "ALPACA" ? { apiKeyId: apiKey, apiSecretKey: apiSecret } :
    broker === "WEBULL" ? { appKey: apiKey, appSecret: apiSecret } :
    { gatewayUrl: apiKey, accountId: apiSecret }; // IBKR

  await adapter.authenticate(credentials);
  return adapter;
}
