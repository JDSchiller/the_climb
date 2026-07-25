import { skillGrid, currentMembership, activeRubric } from "@/lib/services";
import { SectionTitle, fmtDate } from "@/components/ui";
import { EvalForm } from "@/components/eval-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SkillsPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const grid = await skillGrid(athleteId);
  const mem = await currentMembership(athleteId);
  const rubric = await activeRubric("skill_progress");
  const labels: string[] = rubric ? JSON.parse(rubric.scale_labels) : [];

  return (
    <div>
      <SectionTitle>Skill progress · stages, not scores</SectionTitle>
      <div className="card overflow-x-auto">
        {grid && grid.evals.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate2">
                <th className="py-1.5 pr-2 font-semibold">Skill</th>
                {grid.evals.map((ev) => (
                  <th key={ev.id} className="py-1.5 px-2 font-semibold whitespace-nowrap">
                    {fmtDate(ev.eval_date)}
                    <span className="block font-normal">{ev.level_context}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rubric.items.map((it) => (
                <tr key={it.id} className="border-t border-midnight/5">
                  <td className="py-1.5 pr-2">{it.label}</td>
                  {grid.evals.map((ev) => {
                    const v = grid.cells[it.id]?.[ev.id];
                    return (
                      <td key={ev.id} className="py-1.5 px-2">
                        {v ? (
                          <span className={`pill ${v >= 3 ? "bg-gold/25 text-golddk" : v === 1 ? "bg-red-100 text-red-800" : "bg-midnight/10 text-slate2"}`}>
                            {v}
                          </span>
                        ) : <span className="text-slate2"></span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate2">No check-ins yet.</p>
        )}
        <div className="mt-3 text-xs text-slate2">
          {labels.map((l, i) => <span key={i} className="mr-3"><span className="font-bold text-midnight">{i + 1}</span> {l}</span>)}
        </div>
        <p className="text-xs text-slate2 mt-2 italic">
          A stage drop after moving up a level, or during a growth spurt, is information, not a problem.
        </p>
      </div>

      <SectionTitle>Record a check-in yourself</SectionTitle>
      <p className="text-xs text-slate2 mb-2">
        Or send the coach a link instead from the <Link href={`/manage/${athleteId}/evaluators`} className="underline font-semibold">Evaluators</Link> tab. Coach check-ins carry more weight over time.
      </p>
      {rubric && (
        <EvalForm mode="guardian" rubricKind="skill_progress" items={rubric.items} scaleMin={rubric.scale_min}
          scaleMax={rubric.scale_max} scaleLabels={labels} defaultLevel={mem?.level ?? ""} athleteId={athleteId} rubricId={rubric.id} />
      )}
    </div>
  );
}
