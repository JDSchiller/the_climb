import { redirect } from "next/navigation";
import { currentUser, grantsFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Root() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const grants = await grantsFor(user.id);
  const isGuardian = grants.some((g) => g.role === "guardian" || g.role === "manager");
  redirect(isGuardian ? "/manage" : "/home");
}
