import { mediaFor } from "@/lib/services";
import { SectionTitle } from "@/components/ui";
import { ClipUpload } from "@/components/clips";

export const dynamic = "force-dynamic";

export default async function ClipsPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const clips = await mediaFor(athleteId);

  return (
    <div>
      <SectionTitle>Upload a clip</SectionTitle>
      <div className="card"><ClipUpload athleteId={athleteId} blobMode={!!process.env.BLOB_READ_WRITE_TOKEN} /></div>
      <SectionTitle>Clip bank ({clips.length})</SectionTitle>
      {clips.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {clips.map((c) => (
            <figure key={c.id} className="card !p-2">
              <video controls preload="metadata" playsInline className="w-full rounded-lg bg-midnight" src={`/api/media/${c.id}`} />
              <figcaption className="text-xs text-slate2 mt-1 px-1">
                {c.title}{c.season_label ? ` · ${c.season_label}` : ""} · {(c.size_bytes / 1024 / 1024).toFixed(1)} MB
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="card"><p className="text-sm text-slate2">No clips yet. Highlights only. This bank follows him from team to team, so it never gets deleted.</p></div>
      )}
      <p className="text-xs text-slate2 mt-3">
        Clips are private by default and served through an access-checked, logged endpoint. Every view is recorded.
      </p>
    </div>
  );
}
