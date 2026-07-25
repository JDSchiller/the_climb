import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { getAthlete, currentMembership } from "@/lib/services";
import { AppHeader, LogoutButton } from "@/components/ui";

const TABS = [
  ["schedule", "Schedule"],
  ["evaluations", "Games"],
  ["skills", "Skills"],
  ["clips", "Clips"],
  ["ledger", "Ledger"],
  ["documents", "Documents"],
  ["evaluators", "Evaluators"],
] as const;

export default async function AthleteLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await isGuardianOrManager(user.id, athleteId))) redirect("/manage");
  const athlete = await getAthlete(athleteId);
  if (!athlete) notFound();
  const mem = await currentMembership(athleteId);

  return (
    <div className="min-h-screen">
      <AppHeader
        title={athlete.name}
        subtitle={mem ? `${mem.team} \u00b7 ${mem.level} \u00b7 Coach ${mem.coach ?? "TBD"}` : undefined}
        right={
          <div className="flex flex-col items-end gap-1">
            <Link href="/manage" className="text-cream/60 text-xs hover:text-cream underline">All athletes</Link>
            <LogoutButton />
          </div>
        }
      />
      <nav className="bg-white border-b border-midnight/10 sticky top-0 z-10 overflow-x-auto">
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {TABS.map(([slug, label]) => (
            <Link key={slug} href={`/manage/${athleteId}/${slug}`}
              className="px-3 py-2.5 text-sm font-semibold text-slate2 hover:text-midnight whitespace-nowrap border-b-2 border-transparent hover:border-gold">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 pb-16">{children}</main>
    </div>
  );
}
