import { NextResponse } from "next/server";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { createEvalLink } from "@/lib/services";
import { audit } from "@/lib/db";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = await req.json();
  if (!(await isGuardianOrManager(user.id, b.athlete_id))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (!b.evaluator_id || !b.rubric_id) return NextResponse.json({ error: "Evaluator and rubric required." }, { status: 400 });
  const days = Math.min(Math.max(Number(b.days) || 30, 1), 120);
  const link = await createEvalLink({ evaluator_id: b.evaluator_id, athlete_id: b.athlete_id, rubric_id: b.rubric_id, note: b.note || undefined, days, created_by: user.id });
  await audit("eval_link.create", link.id, user.id);
  const origin = new URL(req.url).origin;
  return NextResponse.json({ ok: true, url: `${origin}/e/${link.token}` });
}
