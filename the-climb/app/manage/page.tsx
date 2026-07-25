import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, grantsFor } from "@/lib/auth";
import { getAthlete, currentMembership, upcomingEvents } from "@/lib/services";
import { AppHeader, LogoutButton, fmtDate, fmtTime } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ManageHome() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const grants = grantsFor(user.id).filter((g) => g.role === "guardian" || g.role === "manager");
  if (!grants.length) redirect("/home");
  const athleteIds = [...new Set(grants.map((g) => g.athlete_id))];

  return (
    <div className="min-h-screen">
      <AppHeader title="Athletes" subtitle={`Signed in as ${user.name}`} right={<LogoutButton />} />
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <div className="grid gap-3 mt-4">
          {athleteIds.map((aid) => {
            const a = getAthlete(aid)!;
            const mem = currentMembership(aid);
            const next = upcomingEvents(aid, 1)[0];
            return (
              <Link key={aid} href={`/manage/${aid}/schedule`} className="card hover:border-gold transition-colors block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">{a.name}</div>
                    <div className="text-xs text-slate2">
                      {mem ? `${mem.team} \u00b7 ${mem.level} \u00b7 ${mem.season_label}` : a.sport}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate2">
                    {next ? (
                      <>
                        <div className="font-semibold text-midnight">{next.title}</div>
                        <div>{fmtDate(next.date)} \u00b7 {fmtTime(next.start_time)}</div>
                      </>
                    ) : (
                      "No upcoming events"
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-slate2 mt-6">
          You see only athletes you hold an active grant on. Coach access happens through expiring evaluation links, never a standing login.
        </p>
      </main>
    </div>
  );
}
