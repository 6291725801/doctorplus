import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/auth/rbac";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  redirect(getDefaultDashboardPath(session.role));
}
