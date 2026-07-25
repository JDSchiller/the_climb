import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { currentUser, canAccess } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { Readable } from "stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const doc = db().prepare("SELECT * FROM documents WHERE id = ?").get(id) as
    | { id: string; athlete_id: string; title: string; file_path: string; mime: string }
    | undefined;
  if (!doc) return new Response("Not found", { status: 404 });
  if (!canAccess(user.id, doc.athlete_id)) return new Response("Forbidden", { status: 403 });
  const path = join(UPLOAD_DIR, doc.file_path);
  if (!existsSync(path)) return new Response("File missing", { status: 404 });
  audit("document.view", doc.id, user.id);
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(statSync(path).size),
      "Content-Disposition": `inline; filename="${doc.title.replace(/[^\w.\- ]/g, "")}"`,
    },
  });
}
