import { NextResponse } from "next/server";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { addEvent, deleteEvent } from "@/lib/services";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = await req.json();
  if (!(await isGuardianOrManager(user.id, b.athlete_id))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (!b.date || !b.title || !b.type) return NextResponse.json({ error: "Date, title and type are required." }, { status: 400 });
  const id = await addEvent({
    athlete_id: b.athlete_id, date: b.date, start_time: b.start_time || null, end_time: b.end_time || null,
    title: b.title, type: b.type, location: b.location || null, opponent: b.opponent || null,
    status: b.status || "confirmed", created_by: user.id,
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id")!;
  const athleteId = url.searchParams.get("athlete_id")!;
  if (!(await isGuardianOrManager(user.id, athleteId))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  await deleteEvent(id, athleteId);
  return NextResponse.json({ ok: true });
}
