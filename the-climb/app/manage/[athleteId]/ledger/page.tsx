import { ledgerFor, fmtAmount } from "@/lib/services";
import { SectionTitle, fmtDate } from "@/components/ui";
import { AddLedgerEntryForm } from "@/components/manage-forms";

export const dynamic = "force-dynamic";

const KIND_STYLE: Record<string, string> = {
  opening: "bg-midnight/10 text-slate2",
  earning: "bg-gold/25 text-golddk",
  bonus: "bg-gold/25 text-golddk",
  fine: "bg-red-100 text-red-800",
  payout: "bg-midnight/10 text-slate2",
  release: "bg-gold/25 text-golddk",
  adjustment: "bg-midnight/10 text-slate2",
};

export default async function LedgerPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const l = await ledgerFor(athleteId);
  if (!l) return <p className="text-sm text-slate2 mt-6">No ledger set up for this athlete.</p>;
  const { ledger, entries, balance, withheld, available } = l;
  const fmt = (n: number) => fmtAmount(n, ledger.unit_label, ledger.unit_type);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="card text-center"><div className="eyebrow">Balance</div><div className="text-xl font-bold mt-1">{fmt(balance)}</div></div>
        <div className="card text-center"><div className="eyebrow">Held to savings</div><div className="text-xl font-bold mt-1">{fmt(withheld)}</div>
          {ledger.withhold_release_on && <div className="text-[10px] text-slate2">releases {fmtDate(ledger.withhold_release_on)}</div>}
        </div>
        <div className="card text-center"><div className="eyebrow">Available</div><div className="text-xl font-bold mt-1">{fmt(available)}</div></div>
      </div>

      <SectionTitle>Add entry</SectionTitle>
      <div className="card"><AddLedgerEntryForm athleteId={athleteId} unitLabel={ledger.unit_label} /></div>

      <SectionTitle>All entries ({entries.length})</SectionTitle>
      <div className="card">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-2 border-b border-midnight/5 last:border-0">
            <span className="text-xs text-slate2 w-20 shrink-0">{fmtDate(e.entry_date)}</span>
            <span className={`pill ${KIND_STYLE[e.kind] ?? "bg-midnight/10 text-slate2"}`}>{e.kind}</span>
            <span className="flex-1 text-sm truncate">{e.description}</span>
            <span className={`text-sm font-bold ${e.amount < 0 ? "text-red-700" : ""}`}>
              {e.amount < 0 ? "\u2212" : "+"}{fmt(Math.abs(e.amount))}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate2 mt-3">
        The ledger is visible to the athlete at all times without asking. Withholding is {ledger.withhold_pct}% of earnings and bonuses, released in full at season end. This is a record, not a payment system.
      </p>
    </div>
  );
}
