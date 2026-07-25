import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { currentUser, canAccess } from "@/lib/auth";
import { q1, run, id, audit } from "@/lib/db";
import { currentMembership } from "@/lib/services";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");
const MAX = 300 * 1024 * 1024;

/**
 * Two modes, one route:
 * - JSON body: Vercel Blob client-upload token exchange (production). The browser
 *   uploads straight to Blob storage, so big clips never hit the 4.5MB function limit.
 * - Multipart body: direct-to-disk upload (local dev, or any host with a disk).
 */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return blobTokenExchange(req);
  return diskUpload(req);
}

async function blobTokenExchange(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const p = clientPayload ? (JSON.parse(clientPayload) as { athlete_id?: string }) : {};
        if (!p.athlete_id || !(await canAccess(user.id, p.athlete_id))) throw new Error("No access to this athlete.");
        if (!pathname.startsWith(`media/${p.athlete_id}/`)) throw new Error("Unexpected upload path.");
        return {
          allowedContentTypes: ["video/*"],
          maximumSizeInBytes: MAX,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ u: user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Registration happens via /api/media/register from the client,
        // because this webhook does not fire on localhost.
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

async function diskUpload(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const athleteId = String(fd.get("athlete_id") || "");
  const title = String(fd.get("title") || "Clip");
  if (!file || !athleteId) return NextResponse.json({ error: "Missing file or athlete." }, { status: 400 });
  if (!(await canAccess(user.id, athleteId))) return NextResponse.json({ error: "No access to this athlete." }, { status: 403 });
  if (file.size > MAX) return NextResponse.json({ error: "Clips only — 300 MB max." }, { status: 413 });
  if (!file.type.startsWith("video/")) return NextResponse.json({ error: "Video files only." }, { status: 415 });

  const mid = id();
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mp4").toLowerCase();
  const rel = `${mid}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, rel), Buffer.from(await file.arrayBuffer()));
  const season = (await currentMembership(athleteId))?.season_label ?? null;
  await run(
    "INSERT INTO media (id, athlete_id, uploaded_by, season_label, title, taken_on, file_path, mime, size_bytes) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?)",
    [mid, athleteId, user.id, season, title, rel, file.type, file.size]
  );
  await audit("media.upload", mid, user.id);
  return NextResponse.json({ ok: true, id: mid });
}

// q1 imported for parity with register route type checks
void q1;
