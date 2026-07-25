import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { currentUser, canAccess } from "@/lib/auth";
import { q1, audit } from "@/lib/db";
import { Readable } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const m = await q1<{ id: string; athlete_id: string; file_path: string; mime: string; size_bytes: number }>(
    "SELECT * FROM media WHERE id = ?", [id]
  );
  if (!m) return new Response("Not found", { status: 404 });
  if (!(await canAccess(user.id, m.athlete_id))) return new Response("Forbidden", { status: 403 });
  await audit("media.view", m.id, user.id);

  // Blob-backed: access-checked and audited here, then served by the Blob CDN
  // (unguessable URL) which handles Range requests for video seeking.
  if (m.file_path.startsWith("http")) return Response.redirect(m.file_path, 302);

  // Disk-backed (local dev / disk hosts): stream with Range support.
  const path = join(UPLOAD_DIR, m.file_path);
  if (!existsSync(path)) return new Response("File missing", { status: 404 });
  const size = statSync(path).size;
  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1]) : 0;
    const end = match?.[2] ? Math.min(parseInt(match[2]), size - 1) : size - 1;
    const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": m.mime,
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new Response(stream, {
    headers: { "Content-Length": String(size), "Content-Type": m.mime, "Accept-Ranges": "bytes" },
  });
}
