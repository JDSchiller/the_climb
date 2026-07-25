import { evalLinkByToken, rubricById, currentMembership } from "@/lib/services";
import { run, audit } from "@/lib/db";
import { EvalForm } from "@/components/eval-form";

export const dynamic = "force-dynamic";

export default async function EvaluatorLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await evalLinkByToken(token);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen">
      <header className="bg-midnight text-cream">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="text-[10px] font-bold tracking-[0.28em] text-gold uppercase mb-0.5">The Climb \u00b7 Evaluation</div>
          {link && <h1 className="text-xl font-bold">{link.athlete_name.split(" ")[0]} \u00b7 {link.rubric_name}</h1>}
        </div>
        <div className="h-1 bg-gold" />
      </header>
      <main className="max-w-2xl mx-auto px-4 pb-16 pt-4">{children}</main>
    </div>
  );

  if (!link) return <Shell><div className="card"><p className="text-sm">This link is not valid. Ask the family to send a fresh one.</p></div></Shell>;
  if (link.used_at) return <Shell><div className="card"><p className="text-sm">This evaluation was already submitted. Each link works once — ask the family for a new link for the next check-in.</p></div></Shell>;
  if (new Date(link.expires_at) < new Date()) return <Shell><div className="card"><p className="text-sm">This link has expired. Ask the family to send a fresh one.</p></div></Shell>;

  if (!link.opened_at) {
    await run("UPDATE eval_links SET opened_at = datetime('now') WHERE id = ?", [link.id]);
    await audit("eval_link.open", link.id, null, token);
  }

  const rubric = (await rubricById(link.rubric_id))!;
  const mem = await currentMembership(link.athlete_id);

  return (
    <Shell>
      <div className="card mb-4">
        <p className="text-sm">
          <span className="font-bold">{link.evaluator_name}</span> — thanks for doing this.
          You&rsquo;re rating <span className="font-bold">{link.athlete_name}</span> against the level in front of you, not against his past self.
          {link.note && <span className="block mt-1 text-slate2 text-xs">Note from the family: {link.note}</span>}
        </p>
      </div>
      <EvalForm
        mode="link"
        rubricKind={rubric.kind}
        items={rubric.items}
        scaleMin={rubric.scale_min}
        scaleMax={rubric.scale_max}
        scaleLabels={JSON.parse(rubric.scale_labels)}
        defaultLevel={mem?.level ?? ""}
        token={token}
      />
      <p className="text-xs text-slate2 mt-4 text-center">
        This link shows you one athlete and one rubric, works once, and expires on its own.
      </p>
    </Shell>
  );
}
