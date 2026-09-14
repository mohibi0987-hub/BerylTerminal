import { NextRequest, NextResponse } from "next/server";
import { TwelveDataService } from "@/lib/market-data/twelvedata";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  const symbols = symbol.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const service = new TwelveDataService();
    if (symbols.length > 1) {
      const quotes = await service.getQuotes(symbols);
      return NextResponse.json(quotes);
    }
    const quote = await service.getQuote(symbols[0]);
    return NextResponse.json(quote);
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
