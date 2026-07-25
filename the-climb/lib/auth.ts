import { cookies } from "next/headers";
import { createHash, randomInt, randomBytes } from "crypto";
import { q, q1, run, id } from "./db";

const SESSION_COOKIE = "climb_session";
const SANDBOX = process.env.SANDBOX_MODE !== "false"; // codes shown on screen until a sender is configured

export type User = { id: string; name: string; email: string | null; phone: string | null };
export type Grant = { athlete_id: string; role: string; athlete_name: string };

function hash(t: string) {
  return createHash("sha256").update(t).digest("hex");
}

export function normalizeIdentifier(raw: string): { email?: string; phone?: string } {
  const v = raw.trim().toLowerCase();
  if (v.includes("@")) return { email: v };
  return { phone: v.replace(/[^0-9+]/g, "") };
}

async function findUser(identifier: string): Promise<User | undefined> {
  const idf = normalizeIdentifier(identifier);
  return idf.email
    ? q1<User>("SELECT * FROM users WHERE email = ?", [idf.email])
    : q1<User>("SELECT * FROM users WHERE phone = ?", [idf.phone ?? ""]);
}

/** Invite-only: codes are issued only for users that already exist. No open signup. */
export async function requestCode(identifier: string): Promise<{ ok: boolean; sandboxCode?: string; error?: string }> {
  const user = await findUser(identifier);
  if (!user) return { ok: false, error: "No account found for that email or phone. Accounts are created by a guardian." };
  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await run("INSERT INTO auth_codes (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)", [id(), user.id, code, expires]);
  // Hook: when ready, send via Resend (email) or Twilio (SMS) here instead of returning it.
  console.log(`[auth] login code for ${identifier}: ${code}`);
  return { ok: true, sandboxCode: SANDBOX ? code : undefined };
}

export async function verifyCode(identifier: string, code: string): Promise<{ ok: boolean; token?: string; userId?: string; error?: string }> {
  const user = await findUser(identifier);
  if (!user) return { ok: false, error: "No account found." };
  const row = await q1<{ id: string }>(
    "SELECT id FROM auth_codes WHERE user_id = ? AND code = ? AND used_at IS NULL AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1",
    [user.id, code.trim()]
  );
  if (!row) return { ok: false, error: "That code is wrong or expired. Request a new one." };
  await run("UPDATE auth_codes SET used_at = datetime('now') WHERE id = ?", [row.id]);
  const raw = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await run("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)", [id(), user.id, hash(raw), expires]);
  return { ok: true, token: raw, userId: user.id };
}

export async function setSessionCookie(rawToken: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });
}

export async function clearSession() {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (raw) await run("DELETE FROM sessions WHERE token_hash = ?", [hash(raw)]);
  c.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const row = await q1<User>(
    "SELECT u.id, u.name, u.email, u.phone FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')",
    [hash(raw)]
  );
  return row ?? null;
}

/** Active (non-expired) grants for a user. */
export async function grantsFor(userId: string): Promise<Grant[]> {
  return q<Grant>(
    `SELECT g.athlete_id, g.role, a.name AS athlete_name FROM grants g
     JOIN athletes a ON a.id = g.athlete_id
     WHERE g.user_id = ? AND g.starts_at <= date('now') AND (g.ends_at IS NULL OR g.ends_at >= date('now'))`,
    [userId]
  );
}

export async function canAccess(userId: string, athleteId: string, roles?: string[]): Promise<boolean> {
  const gs = (await grantsFor(userId)).filter((g) => g.athlete_id === athleteId);
  if (!gs.length) return false;
  if (!roles) return true;
  return gs.some((g) => roles.includes(g.role));
}

export async function isGuardianOrManager(userId: string, athleteId: string): Promise<boolean> {
  return canAccess(userId, athleteId, ["guardian", "manager"]);
}
