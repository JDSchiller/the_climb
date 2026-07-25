"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

async function post(url: string, body: unknown): Promise<{ ok?: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

export function AddEventForm({ athleteId }: { athleteId: string }) {
  const [f, setF] = useState({ date: "", start_time: "", title: "", type: "practice", location: "", status: "confirmed" });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const j = await post("/api/events", { ...f, athlete_id: athleteId });
    if (!j.ok) return setError(j.error ?? "Could not add event.");
    setF({ date: "", start_time: "", title: "", type: "practice", location: "", status: "confirmed" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div><label className="label">Date</label><input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} required /></div>
      <div><label className="label">Start time</label><input type="time" className="input" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
      <div><label className="label">Type</label>
        <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
          {["practice", "skills", "lesson", "game", "showcase", "tournament", "training", "admin"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="col-span-2"><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Practice / vs Wolves / Private lesson" required /></div>
      <div><label className="label">Status</label>
        <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="confirmed">confirmed</option><option value="tbd">time TBD</option><option value="placeholder">placeholder</option>
        </select>
      </div>
      <div className="col-span-2"><label className="label">Location</label><input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="RDV Ice Den, Maitland FL" /></div>
      <div className="flex items-end"><button className="btn w-full">Add event</button></div>
      {error && <p className="text-xs text-red-700 col-span-full">{error}</p>}
    </form>
  );
}

export function DeleteEventButton({ athleteId, eventId }: { athleteId: string; eventId: string }) {
  const router = useRouter();
  return (
    <button
      className="text-xs text-slate2 hover:text-red-700"
      onClick={async () => {
        if (!confirm("Remove this event?")) return;
        await fetch(`/api/events?id=${eventId}&athlete_id=${athleteId}`, { method: "DELETE" });
        router.refresh();
      }}
      aria-label="Delete event"
    >
      Remove
    </button>
  );
}

export function AddLedgerEntryForm({ athleteId, unitLabel }: { athleteId: string; unitLabel: string }) {
  const [f, setF] = useState({ entry_date: "", description: "", amount: "", kind: "earning" });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const amt = Math.round(parseFloat(f.amount) * 100);
    if (Number.isNaN(amt)) return setError("Enter an amount.");
    const sign = f.kind === "fine" || f.kind === "payout" ? -1 : 1;
    const j = await post("/api/ledger", { athlete_id: athleteId, entry_date: f.entry_date, description: f.description, amount: sign * Math.abs(amt), kind: f.kind });
    if (!j.ok) return setError(j.error ?? "Could not add entry.");
    setF({ entry_date: "", description: "", amount: "", kind: "earning" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div><label className="label">Date</label><input type="date" className="input" value={f.entry_date} onChange={(e) => setF((p) => ({ ...p, entry_date: e.target.value }))} required /></div>
      <div><label className="label">Kind</label>
        <select className="input" value={f.kind} onChange={(e) => setF((p) => ({ ...p, kind: e.target.value }))}>
          {["earning", "bonus", "fine", "payout", "release", "adjustment"].map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div><label className="label">Amount ({unitLabel})</label><input className="input" inputMode="decimal" value={f.amount} onChange={(e) => setF((p) => ({ ...p, amount: e.target.value }))} placeholder="200" required /></div>
      <div className="flex items-end"><button className="btn w-full">Add</button></div>
      <div className="col-span-full"><label className="label">Description</label><input className="input" value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} placeholder="Intentional first assist vs Lions" required /></div>
      {error && <p className="text-xs text-red-700 col-span-full">{error}</p>}
    </form>
  );
}

export function NewEvaluatorForm() {
  const [f, setF] = useState({ name: "", category: "head_coach", email: "" });
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const j = await post("/api/evaluators", f);
    if (j.ok) { setF({ name: "", category: "head_coach", email: "" }); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="col-span-2"><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} required /></div>
      <div><label className="label">Category</label>
        <select className="input" value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))}>
          {["head_coach", "private_coach", "tryout", "parent", "self", "other"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex items-end"><button className="btn w-full">Add evaluator</button></div>
    </form>
  );
}

export function NewLinkForm({ athleteId, evaluators, rubrics }: {
  athleteId: string;
  evaluators: { id: string; name: string; category: string }[];
  rubrics: { id: string; name: string; kind: string }[];
}) {
  const [f, setF] = useState({ evaluator_id: evaluators[0]?.id ?? "", rubric_id: rubrics[0]?.id ?? "", note: "", days: "30" });
  const [created, setCreated] = useState<string | null>(null);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const j = await post("/api/eval-links", { ...f, athlete_id: athleteId, days: Number(f.days) });
    if (j.ok) { setCreated(String(j.url)); router.refresh(); }
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div><label className="label">Evaluator</label>
        <select className="input" value={f.evaluator_id} onChange={(e) => setF((p) => ({ ...p, evaluator_id: e.target.value }))}>
          {evaluators.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>
      <div><label className="label">Rubric</label>
        <select className="input" value={f.rubric_id} onChange={(e) => setF((p) => ({ ...p, rubric_id: e.target.value }))}>
          {rubrics.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div><label className="label">Expires in (days)</label><input className="input" inputMode="numeric" value={f.days} onChange={(e) => setF((p) => ({ ...p, days: e.target.value }))} /></div>
      <div className="flex items-end"><button className="btn w-full">Create link</button></div>
      <div className="col-span-full"><label className="label">Note (which check-in is this?)</label><input className="input" value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} placeholder="Check-in 2, November" /></div>
      {created && (
        <div className="col-span-full rounded-lg bg-gold/15 border border-gold px-3 py-2 text-sm flex items-center justify-between gap-2">
          <span className="font-mono text-xs truncate">{created}</span>
          <CopyButton text={created} />
        </div>
      )}
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="btn-ghost !py-1 !px-2 text-xs shrink-0"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function DocumentUploadForm({ athleteId }: { athleteId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("contract");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Pick a file.");
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("athlete_id", athleteId); fd.append("title", title || file.name); fd.append("category", category);
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) { setTitle(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
    else setError((await res.json()).error ?? "Upload failed.");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" className="text-xs" />
      <input className="input !w-48" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input !w-32" value={category} onChange={(e) => setCategory(e.target.value)}>
        {["contract", "schedule", "profile", "other"].map((c) => <option key={c}>{c}</option>)}
      </select>
      <button className="btn-gold" disabled={busy}>{busy ? "Uploading..." : "Upload"}</button>
      {error && <p className="text-xs text-red-700 w-full">{error}</p>}
    </form>
  );
}
