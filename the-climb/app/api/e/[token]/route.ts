import { NextResponse } from "next/server";
import { evalLinkByToken, rubricById, createEvaluation } from "@/lib/services";
import { run, audit } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await evalLinkByToken(token);
  if (!link) return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  if (link.used_at) return NextResponse.json({ error: "This link was already used." }, { status: 410 });
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const rubric = await rubricById(link.rubric_id);
  if (!rubric) return NextResponse.json({ error: "Rubric missing." }, { status: 500 });
  const b = await req.json();
  if (!b.eval_date || !b.level_context) return NextResponse.json({ error: "Date and level are required." }, { status: 400 });
  if (!Array.isArray(b.scores) || b.scores.length !== rubric.items.length)
    return NextResponse.json({ error: "Score every item." }, { status: 400 });
  for (const s of b.scores) {
    if (typeof s.score !== "number" || s.score < rubric.scale_min || s.score > rubric.scale_max)
      return NextResponse.json({ error: "Scores out of range." }, { status: 400 });
  }

  const evId = await createEvaluation({
    athlete_id: link.athlete_id,
    rubric_id: link.rubric_id,
    evaluator_id: link.evaluator_id,
    eval_link_id: link.id,
    level_context: b.level_context,
    eval_date: b.eval_date,
    notes: b.notes ?? {},
    scores: b.scores,
  });
  await run("UPDATE eval_links SET used_at = datetime('now') WHERE id = ?", [link.id]);
  await audit("eval_link.submit", evId, null, token);
  return NextResponse.json({ ok: true });
}
