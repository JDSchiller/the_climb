import { NextResponse } from "next/server";
import { currentUser, isGuardianOrManager } from "@/lib/auth";
import { run, id, audit } from "@/lib/db";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = (await req.json()) as { athlete_id?: string; title?: string; category?: string; url?: string; pathname?: string; size?: number; mime?: string };
  if (!b.athlete_id || !b.url || !b.pathname) return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  if (!(await isGuardianOrManager(user.id, b.athlete_id))) return NextResponse.json({ error: "Guardians and managers only." }, { status: 403 });
  if (!b.pathname.startsWith(`docs/${b.athlete_id}/`)) return NextResponse.json({ error: "Path does not match athlete." }, { status: 400 });
  if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(b.url)) return NextResponse.json({ error: "Not a Blob URL." }, { status: 400 });

  const did = id();
  await run(
    "INSERT INTO documents (id, athlete_id, title, category, file_path, mime, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [did, b.athlete_id, b.title || "Document", b.category || "other", b.url, b.mime || "application/octet-stream", b.size ?? 0, user.id]
  );
  await audit("document.upload", did, user.id);
  return NextResponse.json({ ok: true, id: did });
}
