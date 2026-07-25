import { q, q1, run, batch, id, token as makeToken } from "./db";

// ---------- types ----------
export type Athlete = { id: string; name: string; birthdate: string; sport: string; position: string | null; shot: string | null };
export type Membership = { id: string; season_label: string; org: string | null; team: string | null; level: string; coach: string | null };
export type Event = {
  id: string; athlete_id: string; date: string; start_time: string | null; end_time: string | null;
  title: string; type: string; location: string | null; opponent: string | null; status: string;
};
export type Rubric = { id: string; kind: string; name: string; version: number; scale_min: number; scale_max: number; scale_labels: string };
export type RubricItem = { id: string; ord: number; label: string; description: string | null };
export type Evaluator = { id: string; name: string; category: string; email: string | null; phone: string | null };
export type Evaluation = {
  id: string; rubric_id: string; evaluator_id: string | null; author_user_id: string | null;
  level_context: string; eval_date: string; notes: string | null; rubric_kind: string; rubric_name: string;
  evaluator_name: string | null; total: number | null;
};
export type LedgerEntry = { id: string; entry_date: string; description: string; amount: number; kind: string };

// ---------- athletes ----------
export async function getAthlete(athleteId: string): Promise<Athlete | undefined> {
  return q1<Athlete>("SELECT * FROM athletes WHERE id = ?", [athleteId]);
}

export async function currentMembership(athleteId: string): Promise<Membership | undefined> {
  return q1<Membership>("SELECT * FROM memberships WHERE athlete_id = ? ORDER BY season_label DESC LIMIT 1", [athleteId]);
}

// ---------- events ----------
export async function upcomingEvents(athleteId: string, limit = 8): Promise<Event[]> {
  return q<Event>(
    `SELECT * FROM events WHERE athlete_id = ? AND date >= date('now','localtime')
     ORDER BY date ASC, COALESCE(start_time,'99') ASC LIMIT ?`,
    [athleteId, limit]
  );
}

export async function eventsInRange(athleteId: string, from: string, to: string): Promise<Event[]> {
  return q<Event>(
    "SELECT * FROM events WHERE athlete_id = ? AND date >= ? AND date <= ? ORDER BY date, COALESCE(start_time,'99')",
    [athleteId, from, to]
  );
}

export async function recentGames(athleteId: string, limit = 20): Promise<Event[]> {
  return q<Event>(
    `SELECT * FROM events WHERE athlete_id = ? AND type IN ('game','showcase','tournament')
     ORDER BY date DESC LIMIT ?`,
    [athleteId, limit]
  );
}

export async function addEvent(e: Omit<Event, "id"> & { created_by?: string }): Promise<string> {
  const eid = id();
  await run(
    `INSERT INTO events (id, athlete_id, date, start_time, end_time, title, type, location, opponent, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [eid, e.athlete_id, e.date, e.start_time, e.end_time, e.title, e.type, e.location, e.opponent, e.status, e.created_by ?? null]
  );
  return eid;
}

export async function deleteEvent(eventId: string, athleteId: string) {
  await run("DELETE FROM events WHERE id = ? AND athlete_id = ?", [eventId, athleteId]);
}

// ---------- rubrics ----------
export async function activeRubric(kind: string): Promise<(Rubric & { items: RubricItem[] }) | undefined> {
  const r = await q1<Rubric>("SELECT * FROM rubrics WHERE kind = ? AND active = 1 ORDER BY version DESC LIMIT 1", [kind]);
  if (!r) return undefined;
  return { ...r, items: await rubricItems(r.id) };
}

export async function rubricById(rubricId: string): Promise<(Rubric & { items: RubricItem[] }) | undefined> {
  const r = await q1<Rubric>("SELECT * FROM rubrics WHERE id = ?", [rubricId]);
  if (!r) return undefined;
  return { ...r, items: await rubricItems(r.id) };
}

export async function rubricItems(rubricId: string): Promise<RubricItem[]> {
  return q<RubricItem>("SELECT * FROM rubric_items WHERE rubric_id = ? ORDER BY ord", [rubricId]);
}

// ---------- evaluations ----------
export async function createEvaluation(input: {
  athlete_id: string; rubric_id: string; evaluator_id?: string | null; author_user_id?: string | null;
  eval_link_id?: string | null; level_context: string; event_id?: string | null; eval_date: string;
  notes?: Record<string, string>; scores: { rubric_item_id: string; score: number }[];
}): Promise<string> {
  const evId = id();
  const stmts = [
    {
      sql: `INSERT INTO evaluations (id, athlete_id, rubric_id, evaluator_id, author_user_id, eval_link_id, level_context, event_id, eval_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        evId, input.athlete_id, input.rubric_id, input.evaluator_id ?? null, input.author_user_id ?? null,
        input.eval_link_id ?? null, input.level_context, input.event_id ?? null, input.eval_date,
        input.notes ? JSON.stringify(input.notes) : null,
      ],
    },
    ...input.scores.map((s) => ({
      sql: "INSERT INTO evaluation_scores (id, evaluation_id, rubric_item_id, score) VALUES (?, ?, ?, ?)",
      args: [id(), evId, s.rubric_item_id, s.score],
    })),
  ];
  await batch(stmts);
  return evId;
}

export async function evaluationsFor(athleteId: string, kind?: string): Promise<Evaluation[]> {
  const sql = `SELECT e.id, e.rubric_id, e.evaluator_id, e.author_user_id, e.level_context, e.eval_date, e.notes,
              r.kind AS rubric_kind, r.name AS rubric_name, ev.name AS evaluator_name,
              (SELECT SUM(score) FROM evaluation_scores s WHERE s.evaluation_id = e.id) AS total
       FROM evaluations e
       JOIN rubrics r ON r.id = e.rubric_id
       LEFT JOIN evaluators ev ON ev.id = e.evaluator_id
       WHERE e.athlete_id = ? ${kind ? "AND r.kind = ?" : ""}
       ORDER BY e.eval_date DESC, e.created_at DESC`;
  return q<Evaluation>(sql, kind ? [athleteId, kind] : [athleteId]);
}

export async function evaluationScores(evaluationId: string): Promise<{ rubric_item_id: string; score: number; label: string; ord: number }[]> {
  return q(
    `SELECT s.rubric_item_id, s.score, ri.label, ri.ord FROM evaluation_scores s
     JOIN rubric_items ri ON ri.id = s.rubric_item_id WHERE s.evaluation_id = ? ORDER BY ri.ord`,
    [evaluationId]
  ) as Promise<{ rubric_item_id: string; score: number; label: string; ord: number }[]>;
}

/** Latest skill-progress stage per rubric item, plus history columns per evaluation. */
export async function skillGrid(athleteId: string) {
  const rubric = await activeRubric("skill_progress");
  if (!rubric) return null;
  const evals = (await evaluationsFor(athleteId, "skill_progress")).slice(0, 4).reverse(); // oldest -> newest, up to 4 columns
  const cells: Record<string, Record<string, number>> = {};
  for (const ev of evals) {
    for (const s of await evaluationScores(ev.id)) {
      cells[s.rubric_item_id] = cells[s.rubric_item_id] || {};
      cells[s.rubric_item_id][ev.id] = s.score;
    }
  }
  return { rubric, evals, cells };
}

// ---------- evaluators + links ----------
export async function listEvaluators(): Promise<Evaluator[]> {
  return q<Evaluator>("SELECT * FROM evaluators ORDER BY name");
}

export async function createEvaluator(name: string, category: string, email?: string, phone?: string): Promise<string> {
  const eid = id();
  await run("INSERT INTO evaluators (id, name, category, email, phone) VALUES (?, ?, ?, ?, ?)", [eid, name, category, email ?? null, phone ?? null]);
  return eid;
}

export async function createEvalLink(input: { evaluator_id: string; athlete_id: string; rubric_id: string; note?: string; days: number; created_by: string }): Promise<{ id: string; token: string }> {
  const lid = id();
  const tok = makeToken();
  const expires = new Date(Date.now() + input.days * 24 * 3600 * 1000).toISOString();
  await run(
    "INSERT INTO eval_links (id, token, evaluator_id, athlete_id, rubric_id, note, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [lid, tok, input.evaluator_id, input.athlete_id, input.rubric_id, input.note ?? null, expires, input.created_by]
  );
  return { id: lid, token: tok };
}

export type EvalLinkFull = {
  id: string; token: string; evaluator_id: string; athlete_id: string; rubric_id: string; note: string | null;
  expires_at: string; opened_at: string | null; used_at: string | null;
  evaluator_name: string; evaluator_category: string; athlete_name: string; rubric_kind: string; rubric_name: string;
};

export async function evalLinkByToken(tok: string): Promise<EvalLinkFull | undefined> {
  return q1<EvalLinkFull>(
    `SELECT l.*, ev.name AS evaluator_name, ev.category AS evaluator_category, a.name AS athlete_name,
            r.kind AS rubric_kind, r.name AS rubric_name
     FROM eval_links l
     JOIN evaluators ev ON ev.id = l.evaluator_id
     JOIN athletes a ON a.id = l.athlete_id
     JOIN rubrics r ON r.id = l.rubric_id
     WHERE l.token = ?`,
    [tok]
  );
}

export async function linksFor(athleteId: string) {
  return q<{
    id: string; token: string; note: string | null; expires_at: string; opened_at: string | null; used_at: string | null;
    evaluator_name: string; rubric_name: string; rubric_kind: string;
  }>(
    `SELECT l.*, ev.name AS evaluator_name, r.name AS rubric_name, r.kind AS rubric_kind
     FROM eval_links l JOIN evaluators ev ON ev.id = l.evaluator_id JOIN rubrics r ON r.id = l.rubric_id
     WHERE l.athlete_id = ? ORDER BY l.created_at DESC`,
    [athleteId]
  );
}

// ---------- ledger ----------
export async function ledgerFor(athleteId: string) {
  const ledger = await q1<{ id: string; unit_type: string; unit_label: string; withhold_pct: number; withhold_release_on: string | null }>(
    "SELECT * FROM ledgers WHERE athlete_id = ?",
    [athleteId]
  );
  if (!ledger) return null;
  const entries = await q<LedgerEntry>("SELECT * FROM ledger_entries WHERE ledger_id = ? ORDER BY entry_date DESC, created_at DESC", [ledger.id]);
  const balance = entries.reduce((s, e) => s + e.amount, 0);
  const earnings = entries.filter((e) => e.kind === "earning" || e.kind === "bonus").reduce((s, e) => s + e.amount, 0);
  const released = entries.filter((e) => e.kind === "release").reduce((s, e) => s + e.amount, 0);
  const withheld = Math.max(0, Math.round((earnings * ledger.withhold_pct) / 100) - released);
  return { ledger, entries, balance, withheld, available: balance - withheld };
}

export async function addLedgerEntry(athleteId: string, entry: { entry_date: string; description: string; amount: number; kind: string; event_id?: string | null; created_by?: string }) {
  const l = await q1<{ id: string }>("SELECT id FROM ledgers WHERE athlete_id = ?", [athleteId]);
  if (!l) throw new Error("no ledger");
  await run(
    "INSERT INTO ledger_entries (id, ledger_id, entry_date, description, amount, kind, event_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id(), l.id, entry.entry_date, entry.description, entry.amount, entry.kind, entry.event_id ?? null, entry.created_by ?? null]
  );
}

// ---------- media + documents ----------
export async function mediaFor(athleteId: string) {
  return q<{ id: string; title: string; season_label: string | null; taken_on: string | null; mime: string; size_bytes: number; created_at: string }>(
    "SELECT * FROM media WHERE athlete_id = ? ORDER BY COALESCE(taken_on, created_at) DESC",
    [athleteId]
  );
}

export async function documentsFor(athleteId: string) {
  return q<{ id: string; title: string; category: string; mime: string; size_bytes: number; created_at: string }>(
    "SELECT * FROM documents WHERE athlete_id = ? ORDER BY created_at DESC",
    [athleteId]
  );
}

export function fmtAmount(minor: number, label: string, unitType: string): string {
  if (unitType === "currency") {
    const v = (minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${label}${v}`;
  }
  return `${(minor / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${label}`;
}
