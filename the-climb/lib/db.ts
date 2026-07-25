import { createClient, type Client } from "@libsql/client";
import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { dirname, isAbsolute, join } from "path";
import { SCHEMA } from "./schema";

// Turso in production (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN), a local file otherwise.
function resolveTarget(): { url: string; authToken?: string } {
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:data/app.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;
  if (raw.startsWith("file:")) {
    let p = raw.slice(5);
    if (!isAbsolute(p)) p = join(process.cwd(), p);
    try { mkdirSync(dirname(p), { recursive: true }); } catch {}
    return { url: "file:" + p };
  }
  return { url: raw, authToken };
}

type Store = { client: Client; ready: Promise<unknown> };
declare global {
  // eslint-disable-next-line no-var
  var __climbdb: Store | undefined;
}

function store(): Store {
  if (!global.__climbdb) {
    const { url, authToken } = resolveTarget();
    const client = createClient({ url, authToken });
    const ready = client.executeMultiple(SCHEMA); // idempotent: CREATE TABLE IF NOT EXISTS
    global.__climbdb = { client, ready };
  }
  return global.__climbdb;
}

export type Arg = string | number | null;

export async function q<T = Record<string, unknown>>(sql: string, args: Arg[] = []): Promise<T[]> {
  const s = store();
  await s.ready;
  const rs = await s.client.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function q1<T = Record<string, unknown>>(sql: string, args: Arg[] = []): Promise<T | undefined> {
  return (await q<T>(sql, args))[0];
}

export async function run(sql: string, args: Arg[] = []): Promise<void> {
  const s = store();
  await s.ready;
  await s.client.execute({ sql, args });
}

/** Atomic multi-statement write (libsql batch runs in a transaction). */
export async function batch(stmts: { sql: string; args?: Arg[] }[]): Promise<void> {
  if (!stmts.length) return;
  const s = store();
  await s.ready;
  await s.client.batch(stmts.map((x) => ({ sql: x.sql, args: x.args ?? [] })), "write");
}

export function id(): string {
  return randomBytes(12).toString("hex");
}

export function token(): string {
  return randomBytes(24).toString("base64url");
}

export async function audit(action: string, subject: string, userId?: string | null, evalToken?: string | null) {
  await run("INSERT INTO audit_log (id, user_id, eval_token, action, subject) VALUES (?, ?, ?, ?, ?)", [
    id(), userId ?? null, evalToken ?? null, action, subject,
  ]);
}
