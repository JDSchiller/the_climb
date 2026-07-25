"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; ord: number; label: string; description: string | null };
type GameOption = { id: string; label: string };

export function EvalForm({
  mode, rubricKind, items, scaleMin, scaleMax, scaleLabels, defaultLevel,
  athleteId, rubricId, token, games,
}: {
  mode: "guardian" | "link";
  rubricKind: string;
  items: Item[];
  scaleMin: number;
  scaleMax: number;
  scaleLabels: string[];
  defaultLevel: string;
  athleteId?: string;
  rubricId?: string;
  token?: string;
  games?: GameOption[];
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [level, setLevel] = useState(defaultLevel);
  const [evalDate, setEvalDate] = useState("");
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [postBonus, setPostBonus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const isPostGame = rubricKind === "post_game";
  const total = useMemo(() => Object.values(scores).reduce((s, v) => s + v, 0), [scores]);
  const complete = items.every((it) => scores[it.id] != null);
  const range = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);

  const noteFields = isPostGame
    ? [["great", "One thing he did great"], ["work_on", "One thing to work on"], ["his_answer", "His answer: what would he do differently?"]]
    : [["moved", "What moved since last time"], ["focus_next", "The two to work on next"], ["coach_comment", "Comment"]];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return setError("Score every item before submitting.");
    setBusy(true); setError(null);
    const body = {
      level_context: level,
      eval_date: evalDate,
      event_id: eventId || null,
      notes,
      scores: items.map((it) => ({ rubric_item_id: it.id, score: scores[it.id] })),
      post_hustle_bonus: isPostGame && postBonus && total >= 38,
      athlete_id: athleteId,
      rubric_id: rubricId,
    };
    const url = mode === "link" ? `/api/e/${token}` : "/api/evaluations";
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    setBusy(false);
    if (!j.ok) return setError(j.error ?? "Could not save.");
    if (mode === "link") setDone(true);
    else router.refresh();
    if (mode === "guardian") { setScores({}); setNotes({}); setEvalDate(""); setEventId(""); }
  }

  if (done) {
    return (
      <div className="card text-center py-10">
        <div className="text-2xl font-bold mb-2">Submitted. Thank you.</div>
        <p className="text-sm text-slate2">This link is now closed. The family can see your check-in immediately.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Level rated against</label>
          <input className="input" value={level} onChange={(e) => setLevel(e.target.value)} required />
        </div>
        {isPostGame && games && games.length > 0 && (
          <div className="col-span-2">
            <label className="label">Game (optional)</label>
            <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">—</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-paper px-3 py-2 text-xs text-slate2">
        <span className="font-semibold text-midnight">Scale:</span>{" "}
        {scaleLabels.map((l, i) => `${scaleMin + i} ${l}`).join("  \u00b7  ")}
        {!isPostGame && <span className="block mt-1 italic">Always compared to the level being played, never to last year&rsquo;s version of the player.</span>}
      </div>

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card !p-3">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <div>
                <span className="text-sm font-bold">{it.ord}. {it.label}</span>
                {it.description && <span className="block text-xs text-slate2">{it.description}</span>}
              </div>
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={it.label}>
              {range.map((v) => (
                <button key={v} type="button" role="radio" aria-checked={scores[it.id] === v}
                  onClick={() => setScores((p) => ({ ...p, [it.id]: v }))}
                  className={`w-10 h-10 rounded-lg border text-sm font-bold ${
                    scores[it.id] === v ? "bg-gold border-gold text-midnight" : "border-midnight/20 text-slate2 hover:border-gold"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isPostGame && (
        <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${complete && total >= 38 ? "bg-gold/20 text-golddk" : "bg-paper text-slate2"}`}>
          Total: {total} / {items.length * scaleMax}
          {complete && total >= 38 && " \u2014 hustle bonus earned"}
          {complete && total < 30 && " \u2014 under 30: a conversation, not a fine"}
        </div>
      )}
      {isPostGame && complete && total >= 38 && mode === "guardian" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={postBonus} onChange={(e) => setPostBonus(e.target.checked)} />
          Post the $50 hustle bonus to the ledger
        </label>
      )}

      <div className="space-y-2">
        {noteFields.map(([key, label]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <textarea className="input" rows={2} value={notes[key] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [key]: e.target.value }))} />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Saving..." : "Submit evaluation"}</button>
      {isPostGame && <p className="text-xs text-slate2 text-center">Scored the morning after. Never in the car.</p>}
    </form>
  );
}
