import { NextResponse } from "next/server";
import { requestCode } from "@/lib/auth";

export async function POST(req: Request) {
  const { identifier } = await req.json();
  if (!identifier || typeof identifier !== "string") return NextResponse.json({ ok: false, error: "Enter an email or phone." });
  return NextResponse.json(requestCode(identifier));
}
