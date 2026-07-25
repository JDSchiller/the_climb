import type { Event } from "@/lib/services";

export function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

export function fmtTime(t: string | null): string {
  if (!t) return "TBD";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

const TYPE_STYLES: Record<string, string> = {
  game: "bg-gold/25 text-golddk",
  showcase: "bg-gold/25 text-golddk",
  tournament: "bg-gold/25 text-golddk",
  practice: "bg-midnight/10 text-slate2",
  skills: "bg-midnight/10 text-slate2",
  lesson: "bg-midnight/10 text-slate2",
  training: "bg-midnight/10 text-slate2",
  admin: "bg-midnight/10 text-slate2",
};

export function TypePill({ type, status }: { type: string; status?: string }) {
  return (
    <span className="flex gap-1">
      <span className={`pill ${TYPE_STYLES[type] ?? "bg-midnight/10 text-slate2"}`}>{type}</span>
      {status && status !== "confirmed" && <span className="pill bg-red-100 text-red-800">{status === "tbd" ? "time TBD" : "placeholder"}</span>}
    </span>
  );
}

export function EventRow({ e }: { e: Event }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-midnight/5 last:border-0">
      <div className="w-24 shrink-0">
        <div className="text-sm font-semibold">{fmtDate(e.date)}</div>
        <div className="text-xs text-slate2">{fmtTime(e.start_time)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{e.title}</div>
        {e.location && <div className="text-xs text-slate2 truncate">{e.location}</div>}
      </div>
      <TypePill type={e.type} status={e.status} />
    </div>
  );
}

/** Stage dots: 4 slots, filled to the current stage. */
export function StageDots({ stage, max = 4 }: { stage: number | null; max?: number }) {
  return (
    <span className="inline-flex gap-1 items-center">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`inline-block w-3 h-3 rounded-sm ${stage && i < stage ? "bg-gold" : "bg-midnight/10"}`} />
      ))}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-6">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="bg-midnight text-cream">
      <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.28em] text-gold uppercase mb-0.5">The Climb</div>
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-cream/60 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="h-1 bg-gold" />
    </header>
  );
}

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="text-cream/60 text-xs hover:text-cream underline">Sign out</button>
    </form>
  );
}
