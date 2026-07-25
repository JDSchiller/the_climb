import { NextResponse } from "next/server";
import { currentUser, canAccess } from "@/lib/auth";
import { run, id, audit } from "@/lib/db";
import { currentMembership } from "@/lib/services";

/** After a Blob client upload finishes, the browser registers the clip here. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = (await req.json()) as { athlete_id?: string; title?: string; url?: string; pathname?: string; size?: number; mime?: string };
  if (!b.athlete_id || !b.url || !b.pathname) return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  if (!(await canAccess(user.id, b.athlete_id))) return NextResponse.json({ error: "No access to this athlete." }, { status: 403 });
  if (!b.pathname.startsWith(`media/${b.athlete_id}/`)) return NextResponse.json({ error: "Path does not match athlete." }, { status: 400 });
  if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(b.url)) return NextResponse.json({ error: "Not a Blob URL." }, { status: 400 });

  const mid = id();
  const season = (await currentMembership(b.athlete_id))?.season_label ?? null;
  await run(
    "INSERT INTO media (id, athlete_id, uploaded_by, season_label, title, taken_on, file_path, mime, size_bytes) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?)",
    [mid, b.athlete_id, user.id, season, b.title || "Clip", b.url, b.mime || "video/mp4", b.size ?? 0]
  );
  await audit("media.upload", mid, user.id);
  return NextResponse.json({ ok: true, id: mid });
}
