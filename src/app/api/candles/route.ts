import type { NextRequest } from "next/server";
import { TFS } from "@/lib/settings";
import { fail, noStore } from "@/lib/secure";
import { getCandles } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tf = req.nextUrl.searchParams.get("tf") ?? "M5";
  if (!(TFS as readonly string[]).includes(tf)) return fail("bad timeframe");
  try {
    const row = await getCandles(tf);
    return Response.json(
      { tf, candles: row?.candles ?? [], age_sec: row?.age_sec ?? null },
      { headers: noStore },
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
