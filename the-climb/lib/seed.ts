import { q1, batch, id, token as tok } from "./db";

export type SeedResult = { seeded: boolean; coachLink?: string };

/** Seeds Kohen's 2026-27 season + demo athletes. Refuses to touch a database that already has data unless force=true. */
export async function seedIfEmpty(force = false): Promise<SeedResult> {
  const existing = await q1<{ n: number }>("SELECT COUNT(*) AS n FROM users");
  if ((existing?.n ?? 0) > 0 && !force) return { seeded: false };

  // wipe (idempotent seed)
  await batch([
    "audit_log","ledger_entries","ledgers","documents","media","evaluation_scores","evaluations",
    "eval_links","evaluators","rubric_items","rubrics","events","memberships","grants",
    "sessions","auth_codes","users","athletes",
  ].map((t) => ({ sql: `DELETE FROM ${t}` })));

  const S: { sql: string; args: (string | number | null)[] }[] = [];

  // ---------------- users ----------------
  const jordan = id(), kohenUser = id(), demoParent = id();
  const insUser = "INSERT INTO users (id, name, email, phone) VALUES (?, ?, ?, ?)";
  S.push({ sql: insUser, args: [jordan, "Jordan Schiller", "jordan@example.com", "+14075550100"] });
  S.push({ sql: insUser, args: [kohenUser, "Kohen Schiller", "kohen@example.com", "+14075550101"] });
  S.push({ sql: insUser, args: [demoParent, "Demo Parent", "demo@example.com", null] });

  // ---------------- athletes ----------------
  const kohen = id(), rex = id(), finn = id();
  const insAth = "INSERT INTO athletes (id, name, birthdate, sport, position, shot) VALUES (?, ?, ?, ?, ?, ?)";
  S.push({ sql: insAth, args: [kohen, "Kohen Schiller", "2015-01-13", "hockey", "Forward (LW / C)", "Left"] });
  S.push({ sql: insAth, args: [rex, "Rex Calloway", "2014-06-02", "hockey", "Defense", "Right"] });
  S.push({ sql: insAth, args: [finn, "Finn Osei", "2015-09-19", "hockey", "Forward (RW)", "Left"] });

  // ---------------- grants ----------------
  const insGrant = "INSERT INTO grants (id, user_id, athlete_id, role) VALUES (?, ?, ?, ?)";
  S.push({ sql: insGrant, args: [id(), jordan, kohen, "guardian"] });
  S.push({ sql: insGrant, args: [id(), jordan, kohen, "manager"] });
  S.push({ sql: insGrant, args: [id(), kohenUser, kohen, "athlete"] });
  S.push({ sql: insGrant, args: [id(), jordan, rex, "guardian"] });
  S.push({ sql: insGrant, args: [id(), demoParent, finn, "guardian"] });

  // ---------------- memberships ----------------
  const insMem = "INSERT INTO memberships (id, athlete_id, season_label, org, team, level, coach, starts_on, ends_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  S.push({ sql: insMem, args: [id(), kohen, "2026-27", "Central Florida Hockey Club", "Bears 12U AA", "12U AA", "Anthony Bardaro", "2026-08-17", "2027-02-22"] });
  S.push({ sql: insMem, args: [id(), rex, "2026-27", "Demo Hockey Club", "Wolves 12U A", "12U A", "Demo Coach", "2026-08-17", "2027-02-22"] });
  S.push({ sql: insMem, args: [id(), finn, "2026-27", "Demo Hockey Club", "Wolves 12U A", "12U A", "Demo Coach", "2026-08-17", "2027-02-22"] });

  // ---------------- events: Kohen's 2026-27 from the CFHC feed ----------------
  type Ev = { date: string; st?: string; et?: string; title: string; type: string; loc?: string; opp?: string; status?: string };
  const RDV = "RDV Ice Den, Maitland FL";
  const events: Ev[] = [];

  for (const dt of ["2026-07-27", "2026-08-03"]) events.push({ date: dt, st: "19:15", et: "20:15", title: "Summer training", type: "training", loc: RDV });
  events.push({ date: "2026-08-17", st: "19:15", et: "20:15", title: "Practice", type: "practice", loc: RDV });
  events.push({ date: "2026-08-20", st: "19:00", et: "20:00", title: "Practice", type: "practice", loc: RDV });

  {
    const start = new Date("2026-08-24T12:00:00Z");
    const end = new Date("2027-02-22T12:00:00Z");
    for (let t = start.getTime(); t <= end.getTime(); t += 7 * 86400000) {
      const m = new Date(t).toISOString().slice(0, 10);
      events.push({ date: m, st: "18:15", et: "19:15", title: "Practice", type: "practice", loc: RDV });
      events.push({ date: m, st: "19:15", et: "20:15", title: "Skills", type: "skills", loc: RDV });
    }
  }
  for (const th of ["2026-08-27", "2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24", "2026-10-01"])
    events.push({ date: th, st: "19:15", et: "20:15", title: "Practice", type: "practice", loc: RDV });

  events.push({ date: "2026-08-28", st: "14:10", et: "15:10", title: "vs Nassau County Lions", type: "showcase", loc: "Exton, PA", opp: "Nassau County Lions" });
  events.push({ date: "2026-08-28", st: "21:00", et: "22:00", title: "at Loudoun Knights", type: "showcase", loc: "Exton, PA", opp: "Loudoun Knights" });
  events.push({ date: "2026-08-29", st: "10:00", et: "11:00", title: "at Long Island Sharks", type: "showcase", loc: "Exton, PA", opp: "Long Island Sharks" });
  events.push({ date: "2026-08-29", st: "16:00", et: "17:00", title: "at Cutting Edge King Cobras", type: "showcase", loc: "Exton, PA", opp: "Cutting Edge King Cobras" });
  events.push({ date: "2026-08-30", st: "07:00", et: "08:00", title: "at Wonderland Wizards", type: "showcase", loc: "Exton, PA", opp: "Wonderland Wizards" });

  for (const dt of ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"])
    events.push({ date: dt, title: "Labor Day Blue Line Tournament", type: "tournament", status: "tbd" });

  for (const wk of [
    ["2026-09-19", "2026-09-20"], ["2026-10-03", "2026-10-04"], ["2026-10-24", "2026-10-25"],
    ["2026-11-07", "2026-11-08"], ["2026-11-14", "2026-11-15"], ["2026-12-19", "2026-12-20"],
    ["2027-01-09", "2027-01-10"], ["2027-01-30", "2027-01-31"],
  ])
    for (const dt of wk) events.push({ date: dt, title: "SFHL game weekend", type: "game", status: "placeholder" });

  for (const dt of ["2026-12-04", "2026-12-05", "2026-12-06"]) events.push({ date: dt, title: "EJEPL event", type: "showcase", status: "tbd" });
  for (const dt of ["2027-01-29", "2027-01-30", "2027-01-31"]) events.push({ date: dt, title: "EJEPL playoffs", type: "tournament", status: "tbd" });
  for (const dt of ["2027-02-19", "2027-02-20", "2027-02-21"]) events.push({ date: dt, title: "SAHOF State Championships", type: "tournament", status: "tbd" });

  {
    const start = new Date("2026-07-27T12:00:00Z");
    for (let k = 0; k < 21; k++) {
      const dt = new Date(start.getTime() + k * 86400000);
      const dow = dt.getUTCDay();
      if (dow >= 1 && dow <= 5) {
        events.push({ date: dt.toISOString().slice(0, 10), st: "16:00", et: "17:00", title: "Private lesson", type: "lesson", loc: RDV });
      }
    }
  }

  const insEv = "INSERT INTO events (id, athlete_id, date, start_time, end_time, title, type, location, opponent, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  for (const e of events) S.push({ sql: insEv, args: [id(), kohen, e.date, e.st ?? null, e.et ?? null, e.title, e.type, e.loc ?? null, e.opp ?? null, e.status ?? "confirmed", jordan] });
  S.push({ sql: insEv, args: [id(), rex, "2026-08-18", "18:00", "19:00", "Practice", "practice", "Demo Rink", null, "confirmed", jordan] });
  S.push({ sql: insEv, args: [id(), finn, "2026-08-18", "18:00", "19:00", "Practice", "practice", "Demo Rink", null, "confirmed", demoParent] });

  // ---------------- rubrics ----------------
  const postGame = id();
  S.push({
    sql: "INSERT INTO rubrics (id, kind, name, sport, version, scale_min, scale_max, scale_labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [postGame, "post_game", "Post-game evaluation", "hockey", 1, 1, 5,
      JSON.stringify(["was not there", "below his standard", "his normal", "clearly better than normal", "best in the building at that thing"])],
  });
  const pgItems: [string, string][] = [
    ["First three strides", "Explodes out of stops and turns. Does not glide into the play."],
    ["Puck control under pressure", "Keeps it with a body on him. Head up, not staring at it."],
    ["Playmaking intent", "\"I saw the goal before I made the pass.\" Looked before he shot."],
    ["Shot selection and release", "Quick, off the right foot, from a spot that actually scores."],
    ["Battle level", "Goes into walls, traffic and net-front without being asked."],
    ["Backcheck", "First forward back. Stick on puck. Does not coast the neutral zone."],
    ["Support without the puck", "Gives his teammate an option. Good spacing, not chasing."],
    ["Shift finish", "Hard to the whistle. Short shifts. Gets off clean."],
    ["Response to adversity", "Bad shift, bad call, down 3 to 0. Next shift is his best."],
    ["Bench and coachability", "Locked in on the bench. Took the correction and used it."],
  ];
  const skillProg = id();
  S.push({
    sql: "INSERT INTO rubrics (id, kind, name, sport, version, scale_min, scale_max, scale_labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [skillProg, "skill_progress", "Skill progress check-in", "hockey", 1, 1, 4,
      JSON.stringify(["Behind the level", "At the level", "Ahead of the level", "A weapon at the level"])],
  });
  const spItems: [string, string][] = [
    ["Edges and turns", "Inside edge, not flat on two feet."],
    ["First three strides", "Explodes from a standstill. No wind-up."],
    ["Stops and starts", "Stops hard both sides, not just one."],
    ["Backward skating and transitions", "Forward to back without losing speed."],
    ["Stickhandling in tight space", "Handles it in a phone booth, head up."],
    ["Puck protection", "Body between the puck and the defender."],
    ["Passing and receiving", "Both sides. Catches a bad pass cleanly."],
    ["Shot: release and placement", "Quick, off either foot, picks a corner."],
    ["Deception and change of pace", "Looks one way and goes the other."],
    ["Around the net", "Tips, rebounds, second and third whacks."],
  ];
  const insItem = "INSERT INTO rubric_items (id, rubric_id, ord, label, description) VALUES (?, ?, ?, ?, ?)";
  const pgItemIds: string[] = [], spItemIds: string[] = [];
  pgItems.forEach(([l, ds], i) => { const iid = id(); pgItemIds.push(iid); S.push({ sql: insItem, args: [iid, postGame, i + 1, l, ds] }); });
  spItems.forEach(([l, ds], i) => { const iid = id(); spItemIds.push(iid); S.push({ sql: insItem, args: [iid, skillProg, i + 1, l, ds] }); });

  // ---------------- evaluators ----------------
  const bardaro = id(), privCoach = id(), jordanEval = id(), selfEval = id();
  const insEvaluator = "INSERT INTO evaluators (id, name, category, email, phone) VALUES (?, ?, ?, ?, ?)";
  S.push({ sql: insEvaluator, args: [bardaro, "Anthony Bardaro", "head_coach", null, null] });
  S.push({ sql: insEvaluator, args: [privCoach, "Private lesson coach", "private_coach", null, null] });
  S.push({ sql: insEvaluator, args: [jordanEval, "Jordan Schiller (SSMG)", "parent", "jordan@example.com", null] });
  S.push({ sql: insEvaluator, args: [selfEval, "Kohen (self)", "self", null, null] });

  const linkToken = tok();
  S.push({
    sql: "INSERT INTO eval_links (id, token, evaluator_id, athlete_id, rubric_id, note, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id(), linkToken, bardaro, kohen, skillProg, "Check-in 1 (baseline), week of Aug 10", new Date(Date.now() + 30 * 86400000).toISOString(), jordan],
  });

  // ---------------- baseline skill evaluation ----------------
  const evId = id();
  S.push({
    sql: "INSERT INTO evaluations (id, athlete_id, rubric_id, evaluator_id, author_user_id, level_context, eval_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [evId, kohen, skillProg, jordanEval, jordan, "12U AA", "2026-07-20",
      JSON.stringify({ moved: "Pre-season baseline, marked honestly low on purpose.", focus_next: "Puck protection + stops on the off side", coach_comment: "" })],
  });
  const stages = [2, 2, 2, 1, 2, 2, 2, 3, 2, 2];
  stages.forEach((s, i) => S.push({ sql: "INSERT INTO evaluation_scores (id, evaluation_id, rubric_item_id, score) VALUES (?, ?, ?, ?)", args: [id(), evId, spItemIds[i], s] }));

  // ---------------- ledger ----------------
  const ledgerId = id();
  S.push({ sql: "INSERT INTO ledgers (id, athlete_id, unit_type, unit_label, withhold_pct, withhold_release_on) VALUES (?, ?, ?, ?, ?, ?)", args: [ledgerId, kohen, "currency", "$", 10, "2027-02-21"] });
  S.push({ sql: "INSERT INTO ledger_entries (id, ledger_id, entry_date, description, amount, kind, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id(), ledgerId, "2026-07-25", "Opening balance carried from 2025-26 (protected, not subject to fines)", 100000, "opening", jordan] });

  const finnLedger = id();
  S.push({ sql: "INSERT INTO ledgers (id, athlete_id, unit_type, unit_label, withhold_pct) VALUES (?, ?, ?, ?, ?)", args: [finnLedger, finn, "points", "pts", 0] });
  S.push({ sql: "INSERT INTO ledger_entries (id, ledger_id, entry_date, description, amount, kind, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id(), finnLedger, "2026-07-25", "Season kickoff points", 5000, "opening", demoParent] });

  await batch(S);
  return { seeded: true, coachLink: `/e/${linkToken}` };
}
