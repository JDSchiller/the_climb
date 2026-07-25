import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { run, id, audit } from "@/lib/db";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");
const MAX = 25 * 1024 * 1024;

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
        if (!p.athlete_id || !(await isGuardianOrManager(user.id, p.athlete_id))) throw new Error("Guardians and managers only.");
        if (!pathname.startsWith(`docs/${p.athlete_id}/`)) throw new Error("Unexpected upload path.");
        return {
          allowedContentTypes: ["application/*", "image/*", "text/*"],
          maximumSizeInBytes: MAX,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ u: user.id }),
        };
      },
      onUploadCompleted: async () => {},
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
  const title = String(fd.get("title") || file?.name || "Document");
  const category = String(fd.get("category") || "other");
  if (!file || !athleteId) return NextResponse.json({ error: "Missing file or athlete." }, { status: 400 });
  if (!(await isGuardianOrManager(user.id, athleteId))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (file.size > MAX) return NextResponse.json({ error: "25 MB max for documents." }, { status: 413 });

  const did = id();
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
  const rel = `doc-${did}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, rel), Buffer.from(await file.arrayBuffer()));
  await run(
    "INSERT INTO documents (id, athlete_id, title, category, file_path, mime, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [did, athleteId, title, category, rel, file.type || "application/octet-stream", file.size, user.id]
  );
  await audit("document.upload", did, user.id);
  return NextResponse.json({ ok: true, id: did });
}
