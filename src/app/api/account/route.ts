import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getBrokerAdapter } from "@/lib/brokers/registry";
import type { BrokerName, ExecutionMode } from "@/lib/brokers/types";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const broker = (req.nextUrl.searchParams.get("broker") ?? "ALPACA") as BrokerName;
  const mode = (req.nextUrl.searchParams.get("mode") ?? "PAPER") as ExecutionMode;

  try {
    const adapter = await getBrokerAdapter(userId, broker, mode);
    const [account, positions] = await Promise.all([adapter.getAccount(), adapter.getPositions()]);
    return NextResponse.json({ account, positions });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 400 });
  }
}
