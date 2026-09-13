import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) return NextResponse.json([]);

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TWELVEDATA_API_KEY is not set." }, { status: 502 });

  try {
    const res = await fetch(`https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      return NextResponse.json({ error: json.message ?? "Symbol search failed." }, { status: 502 });
    }
    const results = (json.data ?? []).slice(0, 8).map((r: any) => ({
      symbol: r.symbol,
      name: r.instrument_name,
      exchange: r.exchange,
      type: r.instrument_type,
      country: r.country,
    }));
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
