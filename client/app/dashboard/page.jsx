import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const roles = session.roles || [];
  if (roles.includes("owner")) redirect("/dashboard/owner");
  if (roles.includes("reviewer")) redirect("/dashboard/reviewer");
  if (roles.includes("viewer")) redirect("/dashboard/viewer");
  redirect("/"); // fallback
}
