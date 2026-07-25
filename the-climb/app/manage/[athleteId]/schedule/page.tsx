import { upcomingEvents } from "@/lib/services";
import { fmtDate, fmtTime, TypePill, SectionTitle } from "@/components/ui";
import { AddEventForm, DeleteEventButton } from "@/components/manage-forms";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const events = await upcomingEvents(athleteId, 60);

  return (
    <div>
      <SectionTitle>Add to schedule</SectionTitle>
      <div className="card"><AddEventForm athleteId={athleteId} /></div>

      <SectionTitle>Upcoming ({events.length})</SectionTitle>
      <div className="card">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-midnight/5 last:border-0">
            <div className="w-24 shrink-0">
              <div className="text-sm font-semibold">{fmtDate(e.date)}</div>
              <div className="text-xs text-slate2">{fmtTime(e.start_time)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{e.title}</div>
              {e.location && <div className="text-xs text-slate2 truncate">{e.location}</div>}
            </div>
            <TypePill type={e.type} status={e.status} />
            <DeleteEventButton athleteId={athleteId} eventId={e.id} />
          </div>
        ))}
        {!events.length && <p className="text-sm text-slate2">Nothing scheduled. Add the first event above.</p>}
      </div>
      <p className="text-xs text-slate2 mt-3">
        Events marked <span className="font-semibold">time TBD</span> or <span className="font-semibold">placeholder</span> came from the league feed without confirmed details. Confirm before booking travel.
      </p>
    </div>
  );
}
