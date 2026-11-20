import { NextResponse } from "next/server";
import { COOKIE, createSession } from "@/lib/auth";
import { fail, safeEqual } from "@/lib/secure";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return fail("Server not configured: set APP_PASSWORD and AUTH_SECRET in the environment.", 500);
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || !safeEqual(body.password, expected)) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return fail("Wrong password", 401);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
