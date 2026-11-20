import type { NextRequest } from "next/server";
import { fail, noStore } from "@/lib/secure";
import { getStats } from "@/lib/store";
import type { Mode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  if (mode && mode !== "swing" && mode !== "scalping") return fail("bad mode");
  try {
    return Response.json(await getStats((mode as Mode) || undefined), { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
