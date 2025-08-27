import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  console.log("SESSION ROLES:", session.roles);

  if (!session) redirect("/");

  // Default to owner dashboard for first-time users or users with no specific role
  const roles = session.roles || [];
  if (roles.length === 0 || roles.includes("owner")) return redirect("/dashboard/owner");
  
  // For users with specific roles, still default to owner but they can navigate to others
  return redirect("/dashboard/owner");
}
