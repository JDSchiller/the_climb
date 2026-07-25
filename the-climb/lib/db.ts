import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data", "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function db(): Database.Database {
  if (!global.__db) {
    const d = new Database(DB_PATH);
    d.pragma("journal_mode = WAL");
    d.pragma("foreign_keys = ON");
    const schema = readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf8");
    d.exec(schema);
    global.__db = d;
  }
  return global.__db;
}

export function id(): string {
  return randomBytes(12).toString("hex");
}

export function token(): string {
  return randomBytes(24).toString("base64url");
}

export function now(): string {
  return new Date().toISOString();
}

export function audit(action: string, subject: string, userId?: string | null, evalToken?: string | null) {
  db()
    .prepare("INSERT INTO audit_log (id, user_id, eval_token, action, subject) VALUES (?, ?, ?, ?, ?)")
    .run(id(), userId ?? null, evalToken ?? null, action, subject);
}
