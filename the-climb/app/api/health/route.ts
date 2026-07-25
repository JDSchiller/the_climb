import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic. Reports which storage the app resolved and which commit
 * is live. Names and booleans only, never values. Safe to delete once things work.
 */
export async function GET() {
  const names = Object.keys(process.env);
  const urlVar =
    names.find((k) => k.endsWith("TURSO_DATABASE_URL") && process.env[k]) ??
    names.find((k) => k.endsWith("DATABASE_URL") && process.env[k]);
  const tokenVar =
    names.find((k) => k.endsWith("TURSO_AUTH_TOKEN") && process.env[k]) ??
    names.find((k) => k.endsWith("DATABASE_AUTH_TOKEN") && process.env[k]);

  const raw = urlVar ? process.env[urlVar]! : "";
  const mode = raw.startsWith("file:") || raw === "" ? "EPHEMERAL FILE (data will not persist)" : "remote database";

  let userCount: number | string = "unreadable";
  try {
    userCount = (await q1<{ n: number }>("SELECT COUNT(*) AS n FROM users"))?.n ?? 0;
  } catch (e) {
    userCount = `error: ${(e as Error).message}`;
  }

  return NextResponse.json({
    storage_mode: mode,
    database_url_variable: urlVar ?? "NONE FOUND",
    auth_token_variable: tokenVar ?? "NONE FOUND",
    blob_token_present: !!process.env.BLOB_READ_WRITE_TOKEN,
    users_in_database: userCount,
    live_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
    commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE?.slice(0, 80) ?? "unknown",
    storage_related_variable_names: names
      .filter((k) => /TURSO|DATABASE|BLOB|LIBSQL/i.test(k))
      .sort(),
  });
}
