import { redirect } from "next/navigation";
import { currentUser, grantsFor } from "@/lib/auth";
import {
  getAthlete, currentMembership, upcomingEvents, skillGrid, mediaFor,
  ledgerFor, documentsFor, evaluationsFor, fmtAmount,
} from "@/lib/services";
import { AppHeader, EventRow, SectionTitle, StageDots, LogoutButton, fmtDate, fmtTime } from "@/components/ui";
import { ClipUpload } from "@/components/clips";

export const dynamic = "force-dynamic";

export default async function AthleteHome() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const grant = (await grantsFor(user.id)).find((g) => g.role === "athlete");
  if (!grant) redirect("/manage");

  const athlete = (await getAthlete(grant.athlete_id))!;
  const mem = await currentMembership(athlete.id);
  const events = await upcomingEvents(athlete.id, 6);
  const next = events[0];
  const grid = await skillGrid(athlete.id);
  const clips = await mediaFor(athlete.id);
  const ledger = await ledgerFor(athlete.id);
  const docs = await documentsFor(athlete.id);
  const postGame = (await evaluationsFor(athlete.id, "post_game")).slice(0, 3);

  return (
    <div className="min-h-screen">
      <AppHeader
        title={athlete.name.split(" ")[0]}
        subtitle={mem ? `${mem.team} \u00b7 ${mem.level} \u00b7 ${mem.season_label}` : undefined}
        right={<LogoutButton />}
      />
      <main className="max-w-3xl mx-auto px-4 pb-16">
        {next && (
          <div className="card mt-4 border-l-4 border-l-gold">
            <div className="eyebrow mb-1">Next up</div>
            <div className="text-lg font-bold">{next.title}</div>
            <div className="text-sm text-slate2">
              {fmtDate(next.date)} \u00b7 {fmtTime(next.start_time)}{next.location ? ` \u00b7 ${next.location}` : ""}
            </div>
          </div>
        )}

        <SectionTitle>This week and beyond</SectionTitle>
        <div className="card">{events.slice(1).map((e) => <EventRow key={e.id} e={e} />)}
          {events.length <= 1 && <p className="text-sm text-slate2">Nothing else scheduled yet.</p>}
        </div>

        <SectionTitle>Skill progress</SectionTitle>
        <div className="card">
          {grid && grid.evals.length > 0 ? (
            <>
              <p className="text-xs text-slate2 mb-3">
                Rated against the level, not against last year. Latest check-in: {fmtDate(grid.evals[grid.evals.length - 1].eval_date)} at {grid.evals[grid.evals.length - 1].level_context}.
              </p>
              <div className="space-y-2">
                {grid.rubric.items.map((it) => {
                  const latest = grid.evals.length ? grid.cells[it.id]?.[grid.evals[grid.evals.length - 1].id] ?? null : null;
                  return (
                    <div key={it.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{it.label}</span>
                      <StageDots stage={latest} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate2">First check-in coming soon. Ten skills, four stages, filled in across the year.</p>
          )}
        </div>

        <SectionTitle>My clips</SectionTitle>
        <div className="card">
          <ClipUpload athleteId={athlete.id} blobMode={!!process.env.BLOB_READ_WRITE_TOKEN} />
          {clips.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {clips.map((c) => (
                <figure key={c.id}>
                  <video controls preload="metadata" playsInline className="w-full rounded-lg bg-midnight" src={`/api/media/${c.id}`} />
                  <figcaption className="text-xs text-slate2 mt-1">{c.title}{c.season_label ? ` \u00b7 ${c.season_label}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate2 mt-2">No clips yet. Upload your first highlight — this bank follows you from team to team.</p>
          )}
        </div>

        {postGame.length > 0 && (
          <>
            <SectionTitle>Recent games</SectionTitle>
            <div className="card space-y-3">
              {postGame.map((ev) => {
                const notes = ev.notes ? (JSON.parse(ev.notes) as Record<string, string>) : {};
                const bonus = (ev.total ?? 0) >= 38;
                return (
                  <div key={ev.id} className="border-b border-midnight/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{fmtDate(ev.eval_date)}</span>
                      {bonus && <span className="pill bg-gold/25 text-golddk">Hustle bonus earned</span>}
                    </div>
                    {notes.great && <p className="text-sm text-slate2 mt-1">&ldquo;{notes.great}&rdquo;</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {ledger && (
          <>
            <SectionTitle>My ledger</SectionTitle>
            <div className="card">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold">{fmtAmount(ledger.balance, ledger.ledger.unit_label, ledger.ledger.unit_type)}</div>
                  <div className="text-xs text-slate2">Balance \u00b7 {fmtAmount(ledger.withheld, ledger.ledger.unit_label, ledger.ledger.unit_type)} held to savings</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {ledger.entries.slice(0, 5).map((en) => (
                  <div key={en.id} className="flex justify-between text-sm">
                    <span className="text-slate2 truncate pr-3">{fmtDate(en.entry_date)} \u00b7 {en.description}</span>
                    <span className={`font-semibold ${en.amount < 0 ? "text-red-700" : ""}`}>
                      {en.amount < 0 ? "\u2212" : "+"}{fmtAmount(Math.abs(en.amount), ledger.ledger.unit_label, ledger.ledger.unit_type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {docs.length > 0 && (
          <>
            <SectionTitle>My documents</SectionTitle>
            <div className="card space-y-2">
              {docs.map((doc) => (
                <a key={doc.id} className="flex justify-between text-sm hover:underline" href={`/api/documents/${doc.id}`}>
                  <span>{doc.title}</span>
                  <span className="text-slate2 text-xs uppercase">{doc.category}</span>
                </a>
              ))}
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate2 mt-10 italic">
          &ldquo;The summit is the dream. The climb is the plan.&rdquo;
        </p>
      </main>
    </div>
  );
}
