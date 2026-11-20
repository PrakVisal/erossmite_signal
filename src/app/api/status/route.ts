import { fail, noStore } from "@/lib/secure";
import { getHeartbeat } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getHeartbeat(), { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
