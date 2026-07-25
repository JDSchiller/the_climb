import { NextResponse } from "next/server";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { createEvaluation, addLedgerEntry, rubricById } from "@/lib/services";
import { q1, audit } from "@/lib/db";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = await req.json();
  if (!(await isGuardianOrManager(user.id, b.athlete_id))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  const rubric = await rubricById(b.rubric_id);
  if (!rubric) return NextResponse.json({ error: "Unknown rubric." }, { status: 400 });
  if (!b.eval_date || !b.level_context) return NextResponse.json({ error: "Date and level are required." }, { status: 400 });
  if (!Array.isArray(b.scores) || b.scores.length !== rubric.items.length)
    return NextResponse.json({ error: "Score every item." }, { status: 400 });
  for (const s of b.scores) {
    if (typeof s.score !== "number" || s.score < rubric.scale_min || s.score > rubric.scale_max)
      return NextResponse.json({ error: "Scores out of range." }, { status: 400 });
  }
  const parentEvaluator = await q1<{ id: string }>("SELECT id FROM evaluators WHERE category = 'parent' LIMIT 1");
  const evId = await createEvaluation({
    athlete_id: b.athlete_id, rubric_id: b.rubric_id, evaluator_id: parentEvaluator?.id ?? null,
    author_user_id: user.id, level_context: b.level_context, event_id: b.event_id ?? null,
    eval_date: b.eval_date, notes: b.notes ?? {}, scores: b.scores,
  });
  await audit("evaluation.create", evId, user.id);
  if (b.post_hustle_bonus === true && rubric.kind === "post_game") {
    await addLedgerEntry(b.athlete_id, {
      entry_date: b.eval_date, description: "Hustle bonus (evaluation 38+)", amount: 5000, kind: "bonus", event_id: b.event_id ?? null, created_by: user.id,
    });
  }
  return NextResponse.json({ ok: true, id: evId });
}
