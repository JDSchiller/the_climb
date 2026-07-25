import { NextResponse } from "next/server";
import { verifyCode, setSessionCookie, grantsFor, normalizeIdentifier } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { identifier, code } = await req.json();
  const result = verifyCode(identifier, code);
  if (!result.ok || !result.token) return NextResponse.json(result);
  await setSessionCookie(result.token);
  const idf = normalizeIdentifier(identifier);
  const user = (idf.email
    ? db().prepare("SELECT id FROM users WHERE email = ?").get(idf.email)
    : db().prepare("SELECT id FROM users WHERE phone = ?").get(idf.phone)) as { id: string };
  const grants = grantsFor(user.id);
  const isGuardian = grants.some((g) => g.role === "guardian" || g.role === "manager");
  return NextResponse.json({ ok: true, redirect: isGuardian ? "/manage" : "/home" });
}
