import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  console.log("SESSION ROLES:", session.roles);

  if (!session) redirect("/");

  const roles = session.roles || [];
  // Prioritize owner > reviewer > viewer
  if (roles.length === 0 || roles.includes("owner")) return redirect("/dashboard/owner");
  if (roles.includes("reviewer")) return redirect("/dashboard/reviewer");
  if (roles.includes("viewer")) return redirect("/dashboard/viewer");
  return redirect("/"); // fallback
}
