import { listEvaluators, linksFor } from "@/lib/services";
import { q } from "@/lib/db";
import { SectionTitle, fmtDate } from "@/components/ui";
import { NewEvaluatorForm, NewLinkForm, CopyButton } from "@/components/manage-forms";

export const dynamic = "force-dynamic";

export default async function EvaluatorsPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const evaluators = await listEvaluators();
  const rubrics = await q<{ id: string; name: string; kind: string }>("SELECT id, name, kind FROM rubrics WHERE active = 1 ORDER BY kind");
  const links = await linksFor(athleteId);

  const status = (l: { used_at: string | null; opened_at: string | null; expires_at: string }) => {
    if (l.used_at) return ["submitted", "bg-gold/25 text-golddk"];
    if (new Date(l.expires_at) < new Date()) return ["expired", "bg-red-100 text-red-800"];
    if (l.opened_at) return ["opened", "bg-midnight/10 text-slate2"];
    return ["not opened", "bg-midnight/10 text-slate2"];
  };

  return (
    <div>
      <SectionTitle>Send an evaluation link</SectionTitle>
      <div className="card">
        <NewLinkForm athleteId={athleteId} evaluators={evaluators} rubrics={rubrics} />
        <p className="text-xs text-slate2 mt-2">
          Links are single-use and expire on their own. The evaluator sees one athlete, one rubric, and nothing else: no account, no login, no standing access.
        </p>
      </div>

      <SectionTitle>Links ({links.length})</SectionTitle>
      <div className="card space-y-2">
        {links.map((l) => {
          const [label, style] = status(l);
          return (
            <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-midnight/5 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{l.evaluator_name} · {l.rubric_name}</div>
                <div className="text-xs text-slate2 truncate">{l.note ?? "no note"} · expires {fmtDate(l.expires_at.slice(0, 10))}</div>
              </div>
              <span className={`pill ${style}`}>{label}</span>
              {!l.used_at && <CopyButton text={`/e/${l.token}`} />}
            </div>
          );
        })}
        {!links.length && <p className="text-sm text-slate2">No links yet.</p>}
      </div>

      <SectionTitle>Evaluator directory</SectionTitle>
      <div className="card">
        <div className="space-y-1 mb-3">
          {evaluators.map((ev) => (
            <div key={ev.id} className="flex justify-between text-sm py-1">
              <span className="font-semibold">{ev.name}</span>
              <span className="pill bg-midnight/10 text-slate2">{ev.category.replace("_", " ")}</span>
            </div>
          ))}
        </div>
        <NewEvaluatorForm />
      </div>
    </div>
  );
}
