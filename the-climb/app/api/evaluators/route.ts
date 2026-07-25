import { NextResponse } from "next/server";
import { currentUser, grantsFor } from "@/lib/auth";
import { createEvaluator } from "@/lib/services";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const isGuardian = (await grantsFor(user.id)).some((g) => g.role === "guardian" || g.role === "manager");
  if (!isGuardian) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  const b = await req.json();
  if (!b.name || !b.category) return NextResponse.json({ error: "Name and category required." }, { status: 400 });
  const id = await createEvaluator(b.name, b.category, b.email || undefined, b.phone || undefined);
  return NextResponse.json({ ok: true, id });
}
