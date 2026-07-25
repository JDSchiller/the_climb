-- The Climb: athlete-owned development record
-- The athlete is the root object. Everything else attaches to it.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS athletes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birthdate TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'hockey',
  position TEXT,
  shot TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Roles are relationships, not account types. One human, many grants.
-- role: guardian | manager | athlete | viewer
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  role TEXT NOT NULL,
  starts_at TEXT NOT NULL DEFAULT (date('now')),
  ends_at TEXT,
  UNIQUE(user_id, athlete_id, role)
);

-- A season membership: team, level, org. The level stamp lives here and on evaluations.
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  season_label TEXT NOT NULL,
  org TEXT,
  team TEXT,
  level TEXT NOT NULL,
  coach TEXT,
  starts_on TEXT,
  ends_on TEXT
);

-- Times stored as local strings (single-timezone family app, America/New_York).
-- status: confirmed | tbd | placeholder
-- type: practice | skills | game | showcase | tournament | lesson | training | admin
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT,
  opponent TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_events_athlete_date ON events(athlete_id, date);

-- Rubrics are data, not code. Versioned so old evaluations render against
-- the rubric that scored them. kind: post_game | skill_progress
CREATE TABLE IF NOT EXISTS rubrics (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'hockey',
  version INTEGER NOT NULL DEFAULT 1,
  scale_min INTEGER NOT NULL,
  scale_max INTEGER NOT NULL,
  scale_labels TEXT NOT NULL, -- JSON array
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rubric_items (
  id TEXT PRIMARY KEY,
  rubric_id TEXT NOT NULL REFERENCES rubrics(id),
  ord INTEGER NOT NULL,
  label TEXT NOT NULL,
  description TEXT
);

-- Named evaluators, categorized. A directory, not accounts.
-- category: head_coach | private_coach | tryout | parent | self | other
CREATE TABLE IF NOT EXISTS evaluators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tokenized, single-use, expiring links: one evaluator, one athlete, one rubric.
CREATE TABLE IF NOT EXISTS eval_links (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id),
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  rubric_id TEXT NOT NULL REFERENCES rubrics(id),
  note TEXT,
  expires_at TEXT NOT NULL,
  opened_at TEXT,
  used_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every evaluation stamps the level it was rated against and the rubric version.
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  rubric_id TEXT NOT NULL REFERENCES rubrics(id),
  evaluator_id TEXT REFERENCES evaluators(id),
  author_user_id TEXT REFERENCES users(id),
  eval_link_id TEXT REFERENCES eval_links(id),
  level_context TEXT NOT NULL,
  event_id TEXT REFERENCES events(id),
  eval_date TEXT NOT NULL,
  notes TEXT, -- JSON: {great, work_on, his_answer} or {moved, focus_next, coach_comment}
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_evals_athlete ON evaluations(athlete_id, eval_date);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  rubric_item_id TEXT NOT NULL REFERENCES rubric_items(id),
  score INTEGER NOT NULL
);

-- Clips only. Private by default; served through an authed, logged endpoint.
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  uploaded_by TEXT REFERENCES users(id),
  season_label TEXT,
  title TEXT NOT NULL,
  taken_on TEXT,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL REFERENCES athletes(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other', -- contract | schedule | profile | other
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Units, not dollars. unit_type: currency | points. Amounts in integer minor units.
CREATE TABLE IF NOT EXISTS ledgers (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL UNIQUE REFERENCES athletes(id),
  unit_type TEXT NOT NULL DEFAULT 'currency',
  unit_label TEXT NOT NULL DEFAULT '$',
  withhold_pct INTEGER NOT NULL DEFAULT 0,
  withhold_release_on TEXT
);

-- kind: opening | earning | bonus | fine | payout | release | adjustment
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  ledger_id TEXT NOT NULL REFERENCES ledgers(id),
  entry_date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit, minor units
  kind TEXT NOT NULL,
  event_id TEXT REFERENCES events(id),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries ON ledger_entries(ledger_id, entry_date);

-- Who saw what, when. Media views and eval link activity at minimum.
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  eval_token TEXT,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
