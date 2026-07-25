import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** One-time setup: visit this URL once after deploying. Safe to revisit; it refuses to touch existing data. */
export async function GET() {
  const r = await seedIfEmpty(false);
  if (!r.seeded) {
    return NextResponse.json({ seeded: false, message: "Already set up. Nothing was changed. Sign in at /login." });
  }
  return NextResponse.json({
    seeded: true,
    message: "Kohen's 2026-27 season is loaded. Sandbox mode shows login codes on screen.",
    logins: {
      guardian_manager: "jordan@example.com (or +14075550100)",
      athlete: "kohen@example.com (or +14075550101)",
      scoping_demo: "demo@example.com (sees only the demo athlete)",
    },
    coach_bardaro_check_in_link: r.coachLink,
  });
}
