import { NextRequest, NextResponse } from "next/server";
import { TwelveDataService } from "@/lib/market-data/twelvedata";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  try {
    const quote = await new TwelveDataService().getQuote(symbol);
    return NextResponse.json(quote);
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
