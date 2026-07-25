import { NextResponse } from "next/server";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { addLedgerEntry } from "@/lib/services";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = await req.json();
  if (!isGuardianOrManager(user.id, b.athlete_id)) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (!b.entry_date || !b.description || typeof b.amount !== "number" || !b.kind)
    return NextResponse.json({ error: "Date, description, amount and kind are required." }, { status: 400 });
  addLedgerEntry(b.athlete_id, { entry_date: b.entry_date, description: b.description, amount: b.amount, kind: b.kind, created_by: user.id });
  return NextResponse.json({ ok: true });
}
