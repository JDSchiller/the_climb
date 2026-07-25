import { documentsFor } from "@/lib/services";
import { SectionTitle, fmtDate } from "@/components/ui";
import { DocumentUploadForm } from "@/components/manage-forms";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const docs = await documentsFor(athleteId);

  return (
    <div>
      <SectionTitle>Upload a document</SectionTitle>
      <div className="card">
        <DocumentUploadForm athleteId={athleteId} blobMode={!!process.env.BLOB_READ_WRITE_TOKEN} />
        <p className="text-xs text-slate2 mt-2">Contracts, the season schedule PDF, the player profile, the roadmap. 25 MB max each.</p>
      </div>
      <SectionTitle>Documents ({docs.length})</SectionTitle>
      <div className="card">
        {docs.map((d) => (
          <a key={d.id} href={`/api/documents/${d.id}`} className="flex items-center justify-between py-2 border-b border-midnight/5 last:border-0 hover:underline">
            <span className="text-sm font-semibold">{d.title}</span>
            <span className="text-xs text-slate2">{d.category} \u00b7 {fmtDate(d.created_at.slice(0, 10))}</span>
          </a>
        ))}
        {!docs.length && <p className="text-sm text-slate2">Nothing here yet. The contract and this season&rsquo;s schedule are good first uploads.</p>}
      </div>
    </div>
  );
}
