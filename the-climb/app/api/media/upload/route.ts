import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { currentUser, canAccess } from "@/lib/auth";
import { db, id, audit } from "@/lib/db";
import { currentMembership } from "@/lib/services";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");
const MAX = 300 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const athleteId = String(fd.get("athlete_id") || "");
  const title = String(fd.get("title") || "Clip");
  if (!file || !athleteId) return NextResponse.json({ error: "Missing file or athlete." }, { status: 400 });
  if (!canAccess(user.id, athleteId)) return NextResponse.json({ error: "No access to this athlete." }, { status: 403 });
  if (file.size > MAX) return NextResponse.json({ error: "Clips only — 300 MB max." }, { status: 413 });
  if (!file.type.startsWith("video/")) return NextResponse.json({ error: "Video files only." }, { status: 415 });

  const mid = id();
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mp4").toLowerCase();
  const rel = `${mid}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, rel), Buffer.from(await file.arrayBuffer()));
  const season = currentMembership(athleteId)?.season_label ?? null;
  db().prepare(
    "INSERT INTO media (id, athlete_id, uploaded_by, season_label, title, taken_on, file_path, mime, size_bytes) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?)"
  ).run(mid, athleteId, user.id, season, title, rel, file.type, file.size);
  audit("media.upload", mid, user.id);
  return NextResponse.json({ ok: true, id: mid });
}
