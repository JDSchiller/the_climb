import { redirect } from "next/navigation";
export default async function AthleteIndex({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  redirect(`/manage/${athleteId}/schedule`);
}
