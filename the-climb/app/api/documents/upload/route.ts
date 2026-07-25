import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { db, id, audit } from "@/lib/db";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const athleteId = String(fd.get("athlete_id") || "");
  const title = String(fd.get("title") || file?.name || "Document");
  const category = String(fd.get("category") || "other");
  if (!file || !athleteId) return NextResponse.json({ error: "Missing file or athlete." }, { status: 400 });
  if (!isGuardianOrManager(user.id, athleteId)) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "25 MB max for documents." }, { status: 413 });

  const did = id();
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
  const rel = `doc-${did}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, rel), Buffer.from(await file.arrayBuffer()));
  db().prepare(
    "INSERT INTO documents (id, athlete_id, title, category, file_path, mime, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(did, athleteId, title, category, rel, file.type || "application/octet-stream", file.size, user.id);
  audit("document.upload", did, user.id);
  return NextResponse.json({ ok: true, id: did });
}
