import { activeRubric, evaluationsFor, recentGames, currentMembership, evaluationScores } from "@/lib/services";
import { SectionTitle, fmtDate } from "@/components/ui";
import { EvalForm } from "@/components/eval-form";

export const dynamic = "force-dynamic";

export default async function EvaluationsPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const rubric = await activeRubric("post_game");
  const mem = await currentMembership(athleteId);
  const games = (await recentGames(athleteId, 15)).map((g) => ({ id: g.id, label: `${g.date} \u00b7 ${g.title}` }));
  const evals = await evaluationsFor(athleteId, "post_game");

  return (
    <div>
      <SectionTitle>New post-game evaluation</SectionTitle>
      {rubric ? (
        <EvalForm mode="guardian" rubricKind="post_game" items={rubric.items} scaleMin={rubric.scale_min}
          scaleMax={rubric.scale_max} scaleLabels={JSON.parse(rubric.scale_labels)}
          defaultLevel={mem?.level ?? ""} athleteId={athleteId} rubricId={rubric.id} games={games} />
      ) : <p className="text-sm text-slate2">No post-game rubric configured.</p>}

      <SectionTitle>History ({evals.length})</SectionTitle>
      <div className="space-y-3">
        {(await Promise.all(evals.map(async (ev) => ({ ev, scores: await evaluationScores(ev.id) })))).map(({ ev, scores }) => {
          const notes = ev.notes ? (JSON.parse(ev.notes) as Record<string, string>) : {};
          return (
            <div key={ev.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold">{fmtDate(ev.eval_date)}</span>
                  <span className="text-xs text-slate2 ml-2">{ev.level_context} \u00b7 {ev.evaluator_name ?? "Family"}</span>
                </div>
                <span className={`pill ${(ev.total ?? 0) >= 38 ? "bg-gold/25 text-golddk" : "bg-midnight/10 text-slate2"}`}>
                  {ev.total} / 50{(ev.total ?? 0) >= 38 ? " \u00b7 bonus" : ""}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2">
                {scores.map((s) => (
                  <div key={s.rubric_item_id} className="flex justify-between text-xs">
                    <span className="text-slate2">{s.ord}. {s.label}</span><span className="font-semibold">{s.score}</span>
                  </div>
                ))}
              </div>
              {(notes.great || notes.work_on || notes.his_answer) && (
                <div className="mt-2 text-xs text-slate2 space-y-0.5">
                  {notes.great && <p><span className="font-semibold text-midnight">Great:</span> {notes.great}</p>}
                  {notes.work_on && <p><span className="font-semibold text-midnight">Work on:</span> {notes.work_on}</p>}
                  {notes.his_answer && <p><span className="font-semibold text-midnight">His answer:</span> {notes.his_answer}</p>}
                </div>
              )}
            </div>
          );
        })}
        {!evals.length && <p className="text-sm text-slate2">No post-game evaluations yet. First game is Aug 28.</p>}
      </div>
    </div>
  );
}
