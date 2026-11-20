import { sanitize } from "@/lib/settings";
import { fail, noStore } from "@/lib/secure";
import { getSettings, saveSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getSettings(), { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("invalid JSON body");
  try {
    const clean = sanitize(body); // clamps every value to a safe range
    await saveSettings(clean);
    return Response.json(clean, { headers: noStore });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "database error", 500);
  }
}
