import { NextRequest, NextResponse } from "next/server";
import { TwelveDataService } from "@/lib/market-data/twelvedata";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const interval = req.nextUrl.searchParams.get("interval") ?? "1min";
  const outputSize = Number(req.nextUrl.searchParams.get("outputSize") ?? "100");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  try {
    const bars = await new TwelveDataService().getBars(symbol, interval, outputSize);
    return NextResponse.json(bars);
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
