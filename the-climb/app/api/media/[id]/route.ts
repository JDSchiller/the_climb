import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { currentUser, canAccess } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { Readable } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const m = db().prepare("SELECT * FROM media WHERE id = ?").get(id) as
    | { id: string; athlete_id: string; file_path: string; mime: string; size_bytes: number }
    | undefined;
  if (!m) return new Response("Not found", { status: 404 });
  if (!canAccess(user.id, m.athlete_id)) return new Response("Forbidden", { status: 403 });

  const path = join(UPLOAD_DIR, m.file_path);
  if (!existsSync(path)) return new Response("File missing", { status: 404 });
  const size = statSync(path).size;
  audit("media.view", m.id, user.id);

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
