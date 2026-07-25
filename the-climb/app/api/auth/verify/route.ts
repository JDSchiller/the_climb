import { NextResponse } from "next/server";
import { verifyCode, setSessionCookie, grantsFor } from "@/lib/auth";

export async function POST(req: Request) {
  const { identifier, code } = await req.json();
  const result = await verifyCode(identifier, code);
  if (!result.ok || !result.token || !result.userId) return NextResponse.json(result);
  await setSessionCookie(result.token);
  const grants = await grantsFor(result.userId);
  const isGuardian = grants.some((g) => g.role === "guardian" || g.role === "manager");
  return NextResponse.json({ ok: true, redirect: isGuardian ? "/manage" : "/home" });
}
